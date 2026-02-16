const fetch = require("node-fetch");
require("dotenv").config(); // Load .env

class PostageService {
    constructor() {
        // Base URL from .env
        this._baseUrl = process.env.POSTAGE_CALCULATOR_URL || "";
    }

    /**
     * Fetch postage rates from API
     * @param {string} zip - Destination postal code
     * @param {Array<Object>} items - Array of { sku, quantity }
     * @returns {Promise<Array>} List of rate objects
     */
    async fetchPostageRates({ zip, items }) {
        const url = this._baseUrl; // no ?channel= param

        const body = {
            rate: {
                destination: { postal_code: zip },
                items,
            },
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const text = await response.text();
                console.error("❌ Failed to fetch rates:", text);
                throw new Error("Failed to fetch postage rates");
            }

            const data = await response.json();
            console.log("✅ Raw rates from API:", data.rates);

            const ratesData = data.rates || [];

            // ✅ Filter for standard delivery only
            const standardRate = ratesData.find(rate =>
                rate.service_code === 'mills_shipping'
            );

            if (!standardRate) {
                console.warn("⚠️ No standard delivery option found in rates:", ratesData);
                return [];
            }

            console.log("📦 Standard rate found:", standardRate);

            return [{
                service_name: standardRate.service_name,
                service_code: standardRate.service_code,
                cost: standardRate.total_price, // ✅ raw API field is total_price
                currency: standardRate.currency,
            }];

        } catch (e) {
            console.error("🚨 Error fetching postage rates:", e);
            throw e;
        }
    }

    /**
     * Get cheapest postage for a specific SKU
     * @param {string} sku - Product SKU
     * @param {string} zip - Destination postal code
     * @param {number} qty - Quantity
     * @returns {Promise<number>} Cheapest cost in dollars
     */
    async getPostageCost({ sku, zip, qty }) {
        console.log(`🔍 Calculating cheapest postage for ${sku} (ZIP: ${zip}, QTY: ${qty})`);

        try {
            const rates = await this.fetchPostageRates({
                zip,
                items: [{ sku, quantity: qty }],
            });

            if (!rates.length) return 0;

            rates.sort((a, b) => a.cost - b.cost);
            const cheapest = rates[0];

            console.log(`💰 Cheapest: ${cheapest.service} → $${cheapest.cost}`);
            return cheapest.cost;
        } catch (e) {
            console.error("🚨 Error calculating cheapest postage:", e);
            return 0;
        }
    }
}

module.exports = PostageService;