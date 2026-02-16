const fetch = require("node-fetch");

const SHOP = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || "2024-01";

async function fetchOrdersFromShopify() {
  let orders = [];
  let cursor = null;
  let hasNextPage = true;

  const query = `
    query ($first: Int!, $after: String) {
      orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            name
            createdAt
            processedAt
            displayFinancialStatus
            customer { id displayName }
            subtotalPriceSet { shopMoney { amount } }
            metafields(first: 10, namespace: "custom") {
              edges { node { namespace key value } }
            }
            lineItems(first: 100) {
              edges { node { title sku quantity originalUnitPriceSet { shopMoney { amount } } } }
            }
          }
        }
      }
    }
  `;

  while (hasNextPage) {
    const res = await fetch(`https://${SHOP}/admin/api/${VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN,
      },
      body: JSON.stringify({ query, variables: { first: 250, after: cursor } }),
    });

    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));

    const fetched = json.data.orders.edges.map((e) => e.node);
    orders.push(...fetched);

    hasNextPage = json.data.orders.pageInfo.hasNextPage;
    cursor = json.data.orders.pageInfo.endCursor;
  }

  // Only fully paid orders
  orders = orders.filter((o) => o.displayFinancialStatus === "PAID");

  // Map lineItems and extract kiosk_id
  orders = orders.map((o) => {
    // Extract kiosk_id from metafields
    let kiosk_id = null;
    if (o.metafields?.edges) {
      const kioskField = o.metafields.edges.find(
        (m) => m.node.namespace === "custom" && m.node.key === "kiosk_id"
      );
      kiosk_id = kioskField?.node?.value || null;
    }

    return {
      ...o,
      kiosk_id,
      lineItems: o.lineItems?.edges?.map((li) => ({
        title: li.node.title,
        sku: li.node.sku || null,
        quantity: li.node.quantity || 0,
        price: parseFloat(li.node.originalUnitPriceSet?.shopMoney?.amount || 0),
      })) || [],
    };
  });

  return orders;
}

async function fetchWholesaleOrdersFromShopify() {
  let wholesaleOrders = [];
  let cursor = null;
  let hasNextPage = true;

  const query = `
    query ($first: Int!, $after: String) {
        orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true, query: "tag:wholesale") {
            pageInfo { hasNextPage endCursor }
            edges {
                node {
                    id
                    name
                    createdAt
                    processedAt
                    displayFinancialStatus
                    displayFulfillmentStatus
                    subtotalPriceSet { shopMoney { amount } }
                    metafields(first: 10, namespace: "custom") {
                        edges { node { namespace key value } }
                    }
                    lineItems(first: 100) {
                        edges { node { title sku quantity originalUnitPriceSet { shopMoney { amount } } } }
                    }
                }
            }
        }
    }
`;

  while (hasNextPage) {
    const res = await fetch(`https://${SHOP}/admin/api/${VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN,
      },
      body: JSON.stringify({ query, variables: { first: 250, after: cursor } }),
    });

    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));

    // ✅ Always use json.data.orders
    const fetched = json.data.orders.edges.map((e) => e.node);
    wholesaleOrders.push(...fetched);

    hasNextPage = json.data.orders.pageInfo.hasNextPage;
    cursor = json.data.orders.pageInfo.endCursor;
  }

  // ✅ No financial status filter — keep all wholesale orders
  wholesaleOrders = wholesaleOrders.map((o) => {
    // ✅ Helper to extract metafield value by key
    const get = (key) => o.metafields?.edges?.find(
      (m) => m.node.namespace === "custom" && m.node.key === key
    )?.node?.value || null;

    return {
      ...o,
      company_id: get("partner_id"),
      lineItems: o.lineItems?.edges?.map((li) => ({
        title: li.node.title,
        sku: li.node.sku || null,
        quantity: li.node.quantity || 0,
        price: parseFloat(li.node.originalUnitPriceSet?.shopMoney?.amount || 0),
      })) || [],
    };
  });

  return wholesaleOrders;
}

module.exports = { fetchOrdersFromShopify, fetchWholesaleOrdersFromShopify };
