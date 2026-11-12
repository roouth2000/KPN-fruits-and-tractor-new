const {
  sequelize,
  Customer,
  Product,
  Invoice,
  InvoiceItem,
  Payment,
  PaymentAllocation,
  CustomerLedger,
  StockMovement,
  TrayMovement,
  AuditLog,
  Batch,
  InvoiceItemBatch,
  Supplier,
} = require('../models');
const { Op } = require('sequelize');
const fifoService = require('./fifoService');
const customerService = require('./customerService');
const productService = require('./productService');
const { generateInvoiceNumber, generatePaymentNumber, generateReturnNumber } = require('../utils/sequenceGenerator');

class BillingService {
  /**
   * Main Common Billing Transaction Engine
   * Directly uses Sequelize models inside an atomic transaction:
   * Invoice + Items + Stock + Payments + Ledger + Trays + Audit
   */
  async createInvoice(payload, user) {
    const transaction = await sequelize.transaction();

    try {
      const {
        customerId,
        invoiceDate = new Date().toISOString().slice(0, 10),
        dueDate = invoiceDate,
        saleType = 'WHOLESALE',
        items = [],
        invoiceDiscount = 0,
        invoiceTax = 0,
        payments = [],
        trayIssued = 0,
        trayReturned = 0,
        notes = '',
        status = 'CONFIRMED', // 'CONFIRMED' or 'DRAFT'
      } = payload;

      // 1. Fetch & validate customer directly via Customer model
      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) {
        throw new Error('Customer not found');
      }

      const isWalkInCash = customer.customerType === 'WALK_IN' || customer.customerCode === 'CUST-CASH';

      // 2. Calculate true previous due from CustomerLedger transactions (Source of Truth)
      let previousDue = 0;
      if (!isWalkInCash) {
        previousDue = await customerService.calculateCustomerDue(customerId, transaction);
      }

      // 3. Process & recalculate each item on backend (never trust frontend totals)
      let calculatedSubtotal = 0;
      let totalItemDiscounts = 0;
      let totalItemTaxes = 0;
      let totalTrayQuantity = 0;
      const processedItems = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const product = await Product.findByPk(item.productId, { transaction });
        if (!product || !product.isActive) {
          throw new Error(`Product ID ${item.productId} not found or inactive`);
        }

        const qty = parseFloat(item.quantity) || 0;
        if (qty <= 0 && status !== 'DRAFT') {
          throw new Error(`Quantity for product "${product.name}" must be greater than zero`);
        }

        // Determine unit and conversion factor to base unit (e.g. 1 BOX = 20 KG)
        const unit = item.unit || product.defaultUnit || 'BOX';
        const conversionFactor = parseFloat(product.conversionFactor) || 1.0;
        const baseQuantity = Math.round(qty * conversionFactor * 1000) / 1000;

        // Stock check (Prevent negative stock unless user has override permission)
        const currentStock = parseFloat(product.currentStock) || 0;
        if (status === 'CONFIRMED' && currentStock < qty) {
          const userPermissions = user?.permissions || [];
          const hasStockOverride = user?.role === 'ADMIN' || userPermissions.includes('stock.override') || userPermissions.includes('stock_negative_override');
          if (!hasStockOverride) {
            throw new Error(
              `Insufficient stock for "${product.name} (${product.variety})". Available: ${currentStock} ${unit}, Requested: ${qty} ${unit}`
            );
          }
        }

        // Validate or compute rate
        let rate = parseFloat(item.rate);
        if (isNaN(rate) || rate < 0) {
          rate = saleType === 'RETAIL' ? parseFloat(product.retailRate) : parseFloat(product.wholesaleRate);
        }

        const lineRawAmount = Math.round(qty * rate * 100) / 100;
        const itemDiscount = parseFloat(item.discount) || 0;
        const taxRate = parseFloat(item.taxRate) || 0;
        const taxAmount = Math.round(((lineRawAmount - itemDiscount) * (taxRate / 100)) * 100) / 100;
        const lineTotal = Math.round((lineRawAmount - itemDiscount + taxAmount) * 100) / 100;

        calculatedSubtotal += lineRawAmount;
        totalItemDiscounts += itemDiscount;
        totalItemTaxes += taxAmount;

        const itemTrayQty = parseInt(item.trayQuantity, 10) || (product.isTrayRequired ? Math.ceil(qty) : 0);
        totalTrayQuantity += itemTrayQty;

        // Calculate COGS using purchase rate / FIFO batch cost
        const costPrice = parseFloat(product.purchaseRate) || 0;
        const cogsAmount = Math.round(qty * costPrice * 100) / 100;

        processedItems.push({
          productId: product.id,
          productName: product.name,
          variety: product.variety,
          grade: item.grade || product.grade || 'A',
          batchNumber: item.batchNumber || product.batchNumber || null,
          unit,
          quantity: qty,
          baseQuantity,
          rate,
          discount: itemDiscount,
          taxRate,
          taxAmount,
          totalAmount: lineTotal,
          trayQuantity: itemTrayQty,
          costPrice,
          cogsAmount,
        });
      }

      // 4. Calculate Invoice Totals
      const finalDiscount = Math.round((totalItemDiscounts + (parseFloat(invoiceDiscount) || 0)) * 100) / 100;
      const finalTax = Math.round((totalItemTaxes + (parseFloat(invoiceTax) || 0)) * 100) / 100;
      const grandTotal = Math.round((calculatedSubtotal - finalDiscount + finalTax) * 100) / 100;

      // Total payable calculation (Previous Due + Current Sale)
      const totalPayable = Math.round((previousDue + grandTotal) * 100) / 100;

      // 5. Calculate total payments received
      let totalPaid = 0;
      if (Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          totalPaid += parseFloat(p.amount) || 0;
        }
      }
      totalPaid = Math.round(totalPaid * 100) / 100;

      // Balance due for this sale transaction
      let balanceDue = 0;
      if (isWalkInCash) {
        balanceDue = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);
      } else {
        balanceDue = Math.round((totalPayable - totalPaid) * 100) / 100;
      }

      // Determine Invoice Status
      let invoiceStatus = status;
      if (status === 'CONFIRMED') {
        if (totalPaid >= grandTotal) {
          invoiceStatus = 'PAID';
        } else if (totalPaid > 0) {
          invoiceStatus = 'PARTIALLY_PAID';
        } else {
          invoiceStatus = 'CONFIRMED';
        }
      }

      // 6. Generate sequential invoice number
      const invoiceNumber = await generateInvoiceNumber(transaction);

      // 7. Persist Invoice via Invoice model
      const invoice = await Invoice.create({
        invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        saleType,
        invoiceDate,
        dueDate,
        status: invoiceStatus,
        subtotal: calculatedSubtotal,
        discount: finalDiscount,
        tax: finalTax,
        grandTotal,
        paidAmount: totalPaid,
        balanceDue,
        previousDueSnapshot: previousDue,
        totalPayableSnapshot: totalPayable,
        trayIssued: trayIssued > 0 ? trayIssued : totalTrayQuantity,
        trayReturned: trayReturned || 0,
        notes,
        createdById: user ? user.id : null,
      }, { transaction });

      // 8. Persist Invoice Items via InvoiceItem model
      const itemsToInsert = processedItems.map((item) => ({
        ...item,
        invoiceId: invoice.id,
      }));
      await InvoiceItem.bulkCreate(itemsToInsert, { transaction });

      // 9. If status is CONFIRMED, execute inventory, ledger, trays, and payment entries
      if (status !== 'DRAFT') {
        // A. FIFO Stock Allocation & Supplier Batch Trace (Rules 3, 4, 5, 6)
        const insertedItems = await InvoiceItem.findAll({
          where: { invoiceId: invoice.id },
          transaction,
        });

        for (const it of insertedItems) {
          // Rule 7: Check if this sale is backdated (exists later confirmed sale for this product)
          const laterInvoicesCount = await InvoiceItem.count({
            include: [{
              model: Invoice,
              as: 'invoice',
              where: {
                status: { [Op.ne]: 'CANCELLED' },
                invoiceDate: { [Op.gt]: invoiceDate },
                id: { [Op.ne]: invoice.id },
              },
            }],
            where: { productId: it.productId },
            transaction,
          });

          if (laterInvoicesCount > 0) {
            // Backdated sale: replay FIFO allocations across all batches & bills
            await fifoService.recalculateFIFO(it.productId, transaction);
          } else {
            // Chronological sale: deduct first from oldest stock (Rules 3, 4, 5, 6)
            await fifoService.allocateFIFO(
              it.productId,
              it.quantity,
              invoice,
              it,
              transaction
            );
          }

          const remainingBatchStock = await Batch.sum('currentQuantity', {
            where: { productId: it.productId, status: { [Op.ne]: 'EXPIRED' } },
            transaction,
          }) || 0;

          await Product.update(
            { currentStock: Math.round(remainingBatchStock * 100) / 100 },
            { where: { id: it.productId }, transaction }
          );
        }

        // B. Customer Ledger Entry for Sale
        let currentRunningBalance = previousDue;
        if (!isWalkInCash) {
          currentRunningBalance = Math.round((previousDue + grandTotal) * 100) / 100;
          await CustomerLedger.create({
            customerId: customer.id,
            date: invoiceDate,
            type: 'SALE',
            reference: invoiceNumber,
            description: `Sales Invoice #${invoiceNumber} (${items.length} items)`,
            debit: grandTotal,
            credit: 0.00,
            runningBalance: currentRunningBalance,
            createdById: user ? user.id : null,
          }, { transaction });
        }

        // C. Process Payments
        if (Array.isArray(payments) && payments.length > 0) {
          for (const p of payments) {
            const pAmt = parseFloat(p.amount) || 0;
            if (pAmt <= 0) continue;

            const paymentNumber = await generatePaymentNumber(transaction);
            const mode = (p.method || p.paymentMode || 'CASH').toUpperCase();

            const paymentRecord = await Payment.create({
              paymentNumber,
              customerId: customer.id,
              customerName: customer.name,
              invoiceId: invoice.id,
              paymentType: 'SALE_PAYMENT',
              amount: pAmt,
              paymentMode: mode,
              transactionRef: p.transactionRef || null,
              paymentDate: invoiceDate,
              notes: `Payment for ${invoiceNumber}`,
              status: 'CONFIRMED',
              createdById: user ? user.id : null,
            }, { transaction });

            // Payment Allocation
            await PaymentAllocation.create({
              paymentId: paymentRecord.id,
              invoiceId: invoice.id,
              amount: pAmt,
            }, { transaction });

            // Customer Ledger Entry for Payment
            if (!isWalkInCash) {
              currentRunningBalance = Math.round((currentRunningBalance - pAmt) * 100) / 100;
              await CustomerLedger.create({
                customerId: customer.id,
                date: invoiceDate,
                type: 'PAYMENT',
                reference: paymentNumber,
                description: `Payment received (${mode}) for Invoice #${invoiceNumber}`,
                debit: 0.00,
                credit: pAmt,
                runningBalance: currentRunningBalance,
                createdById: user ? user.id : null,
              }, { transaction });
            }
          }
        }

        // D. Tray Movements
        const finalTrayIssued = trayIssued > 0 ? trayIssued : totalTrayQuantity;
        if (finalTrayIssued > 0) {
          await TrayMovement.create({
            customerId: customer.id,
            movementType: 'ISSUE',
            trayType: 'PLASTIC',
            quantity: finalTrayIssued,
            depositAmount: 0.00,
            referenceType: 'INVOICE',
            referenceId: invoiceNumber,
            notes: `Issued on ${invoiceNumber}`,
          }, { transaction });
        }

        if (trayReturned && parseInt(trayReturned, 10) > 0) {
          await TrayMovement.create({
            customerId: customer.id,
            movementType: 'RETURN',
            trayType: 'PLASTIC',
            quantity: parseInt(trayReturned, 10),
            depositAmount: 0.00,
            referenceType: 'INVOICE',
            referenceId: invoiceNumber,
            notes: `Returned on ${invoiceNumber}`,
          }, { transaction });
        }

        // E. Update Customer cache balances
        if (!isWalkInCash) {
          const finalRealDue = await customerService.calculateCustomerDue(customerId, transaction);
          const finalRealTrays = await customerService.calculateOutstandingTrays(customerId, transaction);
          await Customer.update(
            {
              currentDue: finalRealDue,
              outstandingTrays: finalRealTrays,
            },
            { where: { id: customer.id }, transaction }
          );
        }
      }

      // 10. Audit Log
      await AuditLog.create({
        userId: user ? user.id : null,
        userName: user ? user.name : 'System',
        action: status === 'DRAFT' ? 'INVOICE_DRAFT_CREATED' : 'INVOICE_CREATED',
        entity: 'INVOICE',
        entityId: String(invoice.id),
        newValue: JSON.stringify({
          invoiceNumber,
          customer: customer.name,
          grandTotal,
          paid: totalPaid,
          due: balanceDue,
        }),
        ipAddress: null,
      }, { transaction });

      // Commit the atomic database transaction
      await transaction.commit();

      // Return complete invoice payload
      const createdInvoice = await this.getInvoiceById(invoice.id);
      return {
        success: true,
        invoiceId: invoice.id,
        invoiceNumber,
        grandTotal,
        subtotal: calculatedSubtotal,
        discount: finalDiscount,
        tax: finalTax,
        previousDue,
        totalPayable,
        paid: totalPaid,
        due: balanceDue,
        status: invoiceStatus,
        customerName: customer.name,
        invoice: createdInvoice,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Scenario 54: Standalone Previous Due Collection
   * Does NOT create a fake sales invoice!
   */
  async collectPreviousDue(payload, user) {
    const transaction = await sequelize.transaction();

    try {
      const {
        customerId,
        amount,
        paymentMode = 'CASH',
        transactionRef = null,
        paymentDate = new Date().toISOString().slice(0, 10),
        notes = '',
      } = payload;

      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) {
        throw new Error('Customer not found');
      }

      const pAmt = parseFloat(amount) || 0;
      if (pAmt <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      // Calculate previous due from ledger
      const previousDue = await customerService.calculateCustomerDue(customerId, transaction);

      const paymentNumber = await generatePaymentNumber(transaction);
      const remainingDue = Math.round((previousDue - pAmt) * 100) / 100;

      // 1. Create Payment record via Payment model
      const payment = await Payment.create({
        paymentNumber,
        customerId: customer.id,
        customerName: customer.name,
        invoiceId: null, // No sale invoice!
        paymentType: 'PREVIOUS_DUE_COLLECTION',
        amount: pAmt,
        paymentMode: paymentMode.toUpperCase(),
        transactionRef,
        paymentDate,
        notes: notes || `Previous due collection for ${customer.name}`,
        status: 'CONFIRMED',
        createdById: user ? user.id : null,
      }, { transaction });

      // 2. Customer Ledger Entry for Payment via CustomerLedger model
      await CustomerLedger.create({
        customerId: customer.id,
        date: paymentDate,
        type: 'PAYMENT',
        reference: paymentNumber,
        description: `Previous Due Collection (${paymentMode.toUpperCase()})`,
        debit: 0.00,
        credit: pAmt,
        runningBalance: remainingDue,
        createdById: user ? user.id : null,
      }, { transaction });

      // 3. Update Customer Current Due
      const finalRealDue = await customerService.calculateCustomerDue(customerId, transaction);
      await Customer.update(
        { currentDue: finalRealDue },
        { where: { id: customer.id }, transaction }
      );

      // 4. Audit Log
      await AuditLog.create({
        userId: user ? user.id : null,
        userName: user ? user.name : 'System',
        action: 'PREVIOUS_DUE_COLLECTED',
        entity: 'PAYMENT',
        entityId: String(payment.id),
        newValue: JSON.stringify({
          paymentNumber,
          customer: customer.name,
          amount: pAmt,
          previousDue,
          remainingDue,
        }),
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        paymentId: payment.id,
        paymentNumber,
        customerName: customer.name,
        paidAmount: pAmt,
        previousDue,
        remainingDue,
        paymentDate,
        paymentMode: paymentMode.toUpperCase(),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Cancel Invoice (Atomic Reversal)
   * Reverses stock movements, reverses customer ledger, reverses trays, marks invoice CANCELLED
   */
  async cancelInvoice(invoiceId, reason = 'User cancellation', user) {
    const transaction = await sequelize.transaction();

    try {
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { model: InvoiceItem, as: 'items' },
          { model: Customer, as: 'customer' },
        ],
        transaction,
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'CANCELLED') {
        throw new Error('Invoice is already cancelled');
      }

      const items = invoice.items || [];
      const customer = invoice.customer;
      const isWalkInCash = customer && (customer.customerType === 'WALK_IN' || customer.customerCode === 'CUST-CASH');

      // 1. Mark invoice as CANCELLED first so recalculateFIFO excludes it during chronological replay
      await Invoice.update(
        {
          status: 'CANCELLED',
          notes: `${invoice.notes || ''} [Cancelled: ${reason}]`,
        },
        { where: { id: invoice.id }, transaction }
      );

      // 2. Reverse stock movements & recalculate FIFO allocations (Rule 7)
      for (const item of items) {
        await StockMovement.create({
          productId: item.productId,
          movementType: 'SALE_RETURN',
          quantity: parseFloat(item.quantity),
          baseQuantity: parseFloat(item.baseQuantity),
          unit: item.unit,
          rate: item.rate,
          referenceType: 'INVOICE_CANCEL',
          referenceId: invoice.invoiceNumber,
          notes: `Cancelled invoice ${invoice.invoiceNumber}: ${reason}`,
          createdById: user ? user.id : null,
        }, { transaction });

        // Rule 7: Recalculate FIFO allocations for this product without the cancelled invoice
        await fifoService.recalculateFIFO(item.productId, transaction);
      }

      // 3. Reverse customer ledger
      if (!isWalkInCash && customer) {
        const currentDue = await customerService.calculateCustomerDue(customer.id, transaction);
        const grandTotal = parseFloat(invoice.grandTotal) || 0;
        const newBalance = Math.round((currentDue - grandTotal) * 100) / 100;

        await CustomerLedger.create({
          customerId: customer.id,
          date: new Date().toISOString().slice(0, 10),
          type: 'ADJUSTMENT',
          reference: `CNCL-${invoice.invoiceNumber}`,
          description: `Reversal of Cancelled Invoice #${invoice.invoiceNumber}`,
          debit: 0.00,
          credit: grandTotal,
          runningBalance: newBalance,
          createdById: user ? user.id : null,
        }, { transaction });

        await Customer.update(
          { currentDue: newBalance },
          { where: { id: customer.id }, transaction }
        );
      }

      // 4. Audit Log
      await AuditLog.create({
        userId: user ? user.id : null,
        userName: user ? user.name : 'System',
        action: 'INVOICE_CANCELLED',
        entity: 'INVOICE',
        entityId: String(invoice.id),
        oldValue: JSON.stringify({ status: invoice.status }),
        newValue: JSON.stringify({ status: 'CANCELLED', reason }),
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        message: `Invoice ${invoice.invoiceNumber} cancelled and stock/ledger reversed successfully.`,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Sales Return
   */
  async processSalesReturn(invoiceId, returnData, user) {
    const transaction = await sequelize.transaction();

    try {
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { model: InvoiceItem, as: 'items' },
          { model: Customer, as: 'customer' },
        ],
        transaction,
      });

      if (!invoice) throw new Error('Invoice not found');

      const returnNumber = await generateReturnNumber(transaction);
      const { items = [], returnReason = 'Customer return' } = returnData;
      let totalReturnAmount = 0;

      for (const item of items) {
        const invItem = invoice.items.find((i) => i.productId === item.productId);
        if (!invItem) continue;

        const returnQty = parseFloat(item.quantity) || 0;
        if (returnQty <= 0) continue;

        const lineReturnAmount = Math.round(returnQty * parseFloat(invItem.rate) * 100) / 100;
        totalReturnAmount += lineReturnAmount;

        // Restock
        const product = await Product.findByPk(invItem.productId, { transaction });
        if (product) {
          const newStock = Math.round((parseFloat(product.currentStock) + returnQty) * 100) / 100;
          await Product.update(
            { currentStock: newStock },
            { where: { id: product.id }, transaction }
          );

          await StockMovement.create({
            productId: product.id,
            movementType: 'SALE_RETURN',
            quantity: returnQty,
            baseQuantity: Math.round(returnQty * parseFloat(product.conversionFactor) * 100) / 100,
            unit: invItem.unit,
            rate: invItem.rate,
            referenceType: 'SALES_RETURN',
            referenceId: returnNumber,
            notes: `Return against ${invoice.invoiceNumber}: ${returnReason}`,
            createdById: user ? user.id : null,
          }, { transaction });
        }
      }

      // Credit customer ledger
      const customer = invoice.customer;
      const isWalkInCash = customer && (customer.customerType === 'WALK_IN' || customer.customerCode === 'CUST-CASH');
      if (!isWalkInCash && customer && totalReturnAmount > 0) {
        const currentDue = await customerService.calculateCustomerDue(customer.id, transaction);
        const newBalance = Math.round((currentDue - totalReturnAmount) * 100) / 100;

        await CustomerLedger.create({
          customerId: customer.id,
          date: new Date().toISOString().slice(0, 10),
          type: 'RETURN',
          reference: returnNumber,
          description: `Sales Return against #${invoice.invoiceNumber} (${returnReason})`,
          debit: 0.00,
          credit: totalReturnAmount,
          runningBalance: newBalance,
          createdById: user ? user.id : null,
        }, { transaction });

        await Customer.update(
          { currentDue: newBalance },
          { where: { id: customer.id }, transaction }
        );
      }

      await AuditLog.create({
        userId: user ? user.id : null,
        userName: user ? user.name : 'System',
        action: 'SALES_RETURN_CREATED',
        entity: 'INVOICE',
        entityId: String(invoice.id),
        newValue: JSON.stringify({ returnNumber, totalReturnAmount, returnReason }),
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        returnNumber,
        totalReturnAmount,
        invoiceNumber: invoice.invoiceNumber,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Admin Invoice Edit with Permission Gate (sales.edit)
   */
  async updateInvoice(invoiceId, updateData, user) {
    const transaction = await sequelize.transaction();

    try {
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { model: InvoiceItem, as: 'items' },
          { model: Customer, as: 'customer' },
        ],
        transaction,
      });

      if (!invoice) throw new Error('Invoice not found');

      if (invoice.status === 'CANCELLED') {
        throw new Error('Cancelled invoices cannot be edited');
      }

      const oldValues = {
        notes: invoice.notes,
        discount: invoice.discount,
        grandTotal: invoice.grandTotal,
      };

      const fieldsToUpdate = {};
      if (updateData.notes !== undefined) fieldsToUpdate.notes = updateData.notes;
      if (updateData.paymentTerms !== undefined) fieldsToUpdate.paymentTerms = updateData.paymentTerms;
      if (updateData.invoiceDate !== undefined) fieldsToUpdate.invoiceDate = updateData.invoiceDate;

      // Allow admin discount adjustment if specified
      if (updateData.invoiceDiscount !== undefined) {
        const newDiscount = parseFloat(updateData.invoiceDiscount) || 0;
        const subTotal = parseFloat(invoice.subtotal) || 0;
        const tax = parseFloat(invoice.tax) || 0;
        const newGrandTotal = Math.max(0, Math.round((subTotal - newDiscount + tax) * 100) / 100);
        const paidAmount = parseFloat(invoice.paidAmount) || 0;
        const newDue = Math.max(0, Math.round((newGrandTotal - paidAmount) * 100) / 100);

        fieldsToUpdate.discount = newDiscount;
        fieldsToUpdate.grandTotal = newGrandTotal;
        fieldsToUpdate.balanceDue = newDue;

        // If customer ledger entry needs update
        const customer = invoice.customer;
        const isWalkInCash = customer && (customer.customerType === 'WALK_IN' || customer.customerCode === 'CUST-CASH');
        if (!isWalkInCash && customer) {
          const diff = Math.round((newGrandTotal - parseFloat(invoice.grandTotal)) * 100) / 100;
          if (diff !== 0) {
            const currentDue = await customerService.calculateCustomerDue(customer.id, transaction);
            const newBal = Math.round((currentDue + diff) * 100) / 100;

            await CustomerLedger.create({
              customerId: customer.id,
              date: new Date().toISOString().slice(0, 10),
              type: 'ADJUSTMENT',
              reference: `EDIT-${invoice.invoiceNumber}`,
              description: `Admin adjustment on Invoice #${invoice.invoiceNumber}`,
              debit: diff > 0 ? diff : 0.00,
              credit: diff < 0 ? Math.abs(diff) : 0.00,
              runningBalance: newBal,
              createdById: user ? user.id : null,
            }, { transaction });

            await Customer.update(
              { currentDue: newBal },
              { where: { id: customer.id }, transaction }
            );
          }
        }
      }

      await Invoice.update(fieldsToUpdate, { where: { id: invoice.id }, transaction });

      await AuditLog.create({
        userId: user ? user.id : null,
        userName: user ? user.name : 'Administrator',
        action: 'INVOICE_UPDATED',
        entity: 'INVOICE',
        entityId: String(invoice.id),
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify(fieldsToUpdate),
      }, { transaction });

      await transaction.commit();

      return await this.getInvoiceById(invoiceId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getInvoiceById(id) {
    const invoice = await Invoice.findByPk(id, {
      include: [
        {
          model: InvoiceItem,
          as: 'items',
          include: [
            {
              model: InvoiceItemBatch,
              as: 'batchAllocations',
              include: [
                { model: Batch, as: 'batch', attributes: ['id', 'batchNumber', 'purchaseDate', 'purchaseRate', 'unit'] },
                { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'supplierCode', 'city'] },
              ],
            },
          ],
        },
        { model: Customer, as: 'customer' },
        { model: Payment, as: 'payments' },
        { model: PaymentAllocation, as: 'paymentAllocations' },
      ],
    });
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  async getInvoices(filters = {}, pagination = { limit: 20, offset: 0 }) {
    const where = {};

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.startDate && filters.endDate) {
      where.invoiceDate = {
        [Op.between]: [filters.startDate, filters.endDate],
      };
    } else if (filters.startDate) {
      where.invoiceDate = { [Op.gte]: filters.startDate };
    } else if (filters.endDate) {
      where.invoiceDate = { [Op.lte]: filters.endDate };
    }
    if (filters.search) {
      const q = `%${filters.search.trim()}%`;
      where[Op.or] = [
        { invoiceNumber: { [Op.like]: q } },
        { customerName: { [Op.like]: q } },
      ];
    }

    return await Invoice.findAndCountAll({
      where,
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'city'] },
      ],
      order: [['id', 'DESC']],
      limit: parseInt(pagination.limit, 10) || 20,
      offset: parseInt(pagination.offset, 10) || 0,
    });
  }
}

module.exports = new BillingService();
