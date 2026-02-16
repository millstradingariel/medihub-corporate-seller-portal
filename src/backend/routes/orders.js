// backend/routes/wholesale-orders.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");
// =====================================================
// POST /api/wholesale-orders
// Create a new wholesale order with items
// =====================================================
router.post('/wholesale-ordersss',
  authenticate,
  authorize('create_order', 'manage_orders'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      const { 
        items,
        company_id,
        customer_name,
        notes
      } = req.body;

      // Validation
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order must contain at least one item'
        });
      }

      if (!company_id) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      // Verify user belongs to this company (unless corporate user)
      if (req.user.role_type !== 'corporate') {
        const [userCompany] = await connection.query(
          'SELECT company_id FROM company_users WHERE user_id = ? AND company_id = ?',
          [req.user.id, company_id]
        );

        if (userCompany.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to create orders for this company'
          });
        }
      }

      // Start transaction
      await connection.beginTransaction();

      // Calculate order total
      const orderTotal = items.reduce((sum, item) => {
        // Apply 22.5% wholesale discount
        const wholesalePrice = item.price * (1 - 0.225);
        return sum + (wholesalePrice * item.quantity);
      }, 0);

      // Generate unique order name (format: WS-YYYYMMDD-XXXX)
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Get today's order count for sequential numbering
      const [orderCount] = await connection.query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE order_name LIKE ? 
         AND DATE(created_at) = CURDATE()`,
        [`WS-${dateStr}-%`]
      );
      
      const sequence = String(orderCount[0].count + 1).padStart(4, '0');
      const orderName = `WS-${dateStr}-${sequence}`;

      // Insert order into orders table
      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          shopify_order_id,
          kiosk_id,
          order_name,
          order_date,
          paid_date,
          shopify_customer_id,
          customer_name,
          status,
          total_ex_gst,
          created_at
        ) VALUES (?, ?, ?, NOW(), NULL, ?, ?, ?, ?, NOW())`,
        [
          null,                           // No Shopify ID for wholesale orders
          null,                           // No kiosk for wholesale orders
          orderName,
          customer_name || 'Wholesale Customer',
          company_id,                     // Use company_id as customer identifier
          'Pending',                      // Initial status
          orderTotal.toFixed(2)
        ]
      );

      const orderId = orderResult.insertId;

      // Insert order items
      const itemInserts = items.map(item => {
        const wholesalePrice = item.price * (1 - 0.225);
        return [
          orderId,
          item.productTitle,
          item.sku,
          item.quantity,
          wholesalePrice.toFixed(2)
        ];
      });

      await connection.query(
        `INSERT INTO order_items (
          order_id,
          title,
          sku,
          quantity,
          price
        ) VALUES ?`,
        [itemInserts]
      );

      // Commit transaction
      await connection.commit();

      console.log(`✅ Wholesale order created: ${orderName} (ID: ${orderId})`);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          order_id: orderId,
          order_name: orderName,
          total: orderTotal.toFixed(2),
          items_count: items.length,
          status: 'Pending'
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      
      console.error('❌ Create wholesale order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
);

// =====================================================
// GET /api/wholesale-orders
// Get all wholesale orders (filtered by company for non-admin users)
// =====================================================
router.get('/wholesale-orders',
  authenticate,
  authorize('view_orders'),
  async (req, res) => {
    try {
      const { company_id, status, start_date, end_date } = req.query;

      let query = `
        SELECT 
          o.shopify_order_id as order_id,
          o.order_name,
          o.order_date,
          o.paid_date,
          o.customer_name,
          o.status,
          o.total_ex_gst,
          o.created_at,
          COUNT(oi.order_id) as items_count
        FROM orders o
        LEFT JOIN order_items oi ON o.shopify_order_id = oi.order_id
        WHERE o.order_name LIKE 'WS-%'
      `;

      const params = [];

      // Filter by company for non-corporate users
      if (req.user.role_type !== 'corporate') {
        const [userCompany] = await pool.query(
          'SELECT company_id FROM company_users WHERE user_id = ?',
          [req.user.id]
        );

        if (userCompany.length > 0) {
          query += ' AND o.shopify_customer_id = ?';
          params.push(userCompany[0].company_id);
        }
      } else if (company_id) {
        // Corporate users can filter by specific company
        query += ' AND o.shopify_customer_id = ?';
        params.push(company_id);
      }

      // Status filter
      if (status) {
        query += ' AND o.status = ?';
        params.push(status);
      }

      // Date range filter
      if (start_date) {
        query += ' AND o.order_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        query += ' AND o.order_date <= ?';
        params.push(end_date);
      }

      query += ' GROUP BY o.shopify_order_id ORDER BY o.created_at DESC';

      const [orders] = await pool.query(query, params);

      res.json({
        success: true,
        data: orders
      });

    } catch (error) {
      console.error('Get wholesale orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }
  }
);

// =====================================================
// GET /api/wholesale-orders/:orderId
// Get single order with items
// =====================================================
router.get('/wholesale-orders/:orderId',
  authenticate,
  authorize('view_orders'),
  async (req, res) => {
    try {
      const { orderId } = req.params;

      // Get order details
      const [orders] = await pool.query(
        `SELECT 
          shopify_order_id as order_id,
          order_name,
          order_date,
          paid_date,
          shopify_customer_id as company_id,
          customer_name,
          status,
          total_ex_gst,
          created_at
        FROM orders
        WHERE shopify_order_id = ? AND order_name LIKE 'WS-%'`,
        [orderId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const order = orders[0];

      // Verify access for non-corporate users
      if (req.user.role_type !== 'corporate') {
        const [userCompany] = await pool.query(
          'SELECT company_id FROM company_users WHERE user_id = ?',
          [req.user.id]
        );

        if (userCompany.length === 0 || userCompany[0].company_id !== order.company_id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }

      // Get order items
      const [items] = await pool.query(
        `SELECT 
          title,
          sku,
          quantity,
          price
        FROM order_items
        WHERE order_id = ?`,
        [orderId]
      );

      order.items = items;

      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      console.error('Get wholesale order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order'
      });
    }
  }
);

// =====================================================
// PATCH /api/wholesale-orders/:orderId/status
// Update order status
// =====================================================
router.patch('/wholesale-orders/:orderId/status',
  authenticate,
  authorize('manage_orders'),
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['Pending', 'Processing', 'Paid', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Update status
      const [result] = await pool.query(
        'UPDATE orders SET status = ?, paid_date = ? WHERE shopify_order_id = ?',
        [
          status,
          status === 'Paid' ? new Date() : null,
          orderId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        message: 'Order status updated successfully'
      });

    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status'
      });
    }
  }
);

// =====================================================
// DELETE /api/wholesale-orders/:orderId
// Cancel/Delete order (only if status is Pending)
// =====================================================
router.delete('/wholesale-orders/:orderId',
  authenticate,
  authorize('manage_orders'),
  async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      const { orderId } = req.params;

      await connection.beginTransaction();

      // Check order status
      const [orders] = await connection.query(
        'SELECT status FROM orders WHERE shopify_order_id = ?',
        [orderId]
      );

      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (orders[0].status !== 'Pending') {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: 'Only pending orders can be cancelled'
        });
      }

      // Delete order items first
      await connection.query(
        'DELETE FROM order_items WHERE order_id = ?',
        [orderId]
      );

      // Delete order
      await connection.query(
        'DELETE FROM orders WHERE shopify_order_id = ?',
        [orderId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });

    } catch (error) {
      await connection.rollback();
      
      console.error('Delete order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel order'
      });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;