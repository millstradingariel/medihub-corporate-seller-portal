import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ShoppingCart,
    Search,
    Package,
    AlertCircle,
    ChevronDown,
    Plus,
    Minus,
    X,
    CheckCircle,
    Trash2,
    Loader,
    Filter,
    MapPin,
    ChevronRight,
    Truck,
    DollarSign
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface CartItem {
    productId: number;
    variantId: number;
    productTitle: string;
    sku: string;
    quantity: number;
    price: number;
    compareAtPrice: number;
    image: string;
}

interface Inventory {
    available: number;
    isAvailable: boolean;
    management: string;
    policy: string;
}

interface ProductVariant {
    variantId: number;
    sku: string;
    name: string;
    price: number;
    compareAtPrice: number;
    inventory: Inventory;
    imageUrls: string[];
}

interface Product {
    _id: string;
    productId: number;
    title: string;
    vendor?: string;
    productType?: string;
    images: string;
    tags?: string;
    variants: ProductVariant[];
    updatedAt: string;
}

interface FilterState {
    availability: 'all' | 'available' | 'unavailable';
    productType: string;
    vendor: string;
    searchTerm: string;
}

interface Location {
    _id?: string;
    id?: number;
    name: string;
    location_name?: string;
    location_id?: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_postcode?: string;
}

interface WholesaleOrderingPortalProps {
    currentUser?: any;
}

const Orders: React.FC<WholesaleOrderingPortalProps> = ({ currentUser }) => {
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({});
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [locationLoading, setLocationLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [shippingFee, setShippingFee] = useState(10.00);
    const [customShippingDetails, setCustomShippingDetails] = useState('');
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualAddress, setManualAddress] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        postcode: '',
    });
    const autocompleteRef = useRef<HTMLInputElement>(null);
    const autocompleteInstanceRef = useRef<any>(null);

    // NEW: Shipping options state
    const [shippingOptions, setShippingOptions] = useState<{
        [key: string]: Array<{
            service_name: string;
            service_code: string;
            total_price: number;
            currency: string;
            cost?: number;
        }>;
    }>({});
    const [selectedShippingMethod, setSelectedShippingMethod] = useState<{
        [sku: string]: string;
    }>({});
    const [loadingShipping, setLoadingShipping] = useState<string | null>(null);

    // Filter state
    const [filters, setFilters] = useState<FilterState>({
        availability: 'all',
        productType: '',
        vendor: '',
        searchTerm: ''
    });

    // Get unique values for filters
    const productTypes = Array.from(
        new Set(products.map(p => p.productType).filter(Boolean))
    );
    const vendors = Array.from(
        new Set(products.map(p => p.vendor).filter(Boolean))
    );

    // ============================================
    // FETCH LOCATIONS FOR COMPANY
    // ============================================
    const fetchCompanyLocations = async () => {
        try {
            setLocationLoading(true);
            setCheckoutError(null);

            const token = localStorage.getItem('supabaseToken');
            const companyId = currentUser?.companyId;

            if (!companyId) {
                console.error("❌ No company ID found");
                setCheckoutError("Company ID not found. Please log in again.");
                return;
            }

            console.log('🔄 Fetching locations for company:', companyId);

            const res = await fetch(
                `${API_URL}/api/locations?companyId=${currentUser.companyId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            console.log('📡 Response status:', res.status);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: Failed to fetch locations`);
            }

            const json = await res.json();
            console.log('📦 Response:', json);
            console.log('📍 Locations found:', json.data?.length || 0);

            setLocations(json.data || []);

            if (!json.data || json.data.length === 0) {
                console.warn('⚠️ No locations found for this company');
                setCheckoutError("No locations available for your company");
            }
        } catch (err) {
            console.error("❌ Location fetch error:", err);
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            setCheckoutError(`Failed to load locations: ${errorMsg}`);
        } finally {
            setLocationLoading(false);
        }
    };

    // Add this useEffect to initialize Google Places autocomplete
    useEffect(() => {
        if (!showManualEntry || !autocompleteRef.current) return;

        const script = document.getElementById('google-places-script');
        const initAutocomplete = () => {
            if (!autocompleteRef.current || !window.google) return;

            autocompleteInstanceRef.current = new window.google.maps.places.Autocomplete(
                autocompleteRef.current,
                {
                    types: ['address'],
                    componentRestrictions: { country: 'au' }, // Change to your country
                    fields: ['address_components', 'formatted_address'],
                }
            );

            autocompleteInstanceRef.current.addListener('place_changed', () => {
                const place = autocompleteInstanceRef.current?.getPlace();
                if (!place?.address_components) return;

                const get = (type: string) =>
                    place.address_components?.find(c => c.types.includes(type))?.long_name || '';
                const getShort = (type: string) =>
                    place.address_components?.find(c => c.types.includes(type))?.short_name || '';

                const streetNumber = get('street_number');
                const route = get('route');

                setManualAddress(prev => ({
                    ...prev,
                    address: `${streetNumber} ${route}`.trim(),
                    city: get('locality') || get('sublocality'),
                    state: getShort('administrative_area_level_1'),
                    postcode: get('postal_code'),
                }));
            });
        };

        if (window.google) {
            initAutocomplete();
        } else if (!script) {
            const s = document.createElement('script');
            s.id = 'google-places-script';
            s.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&libraries=places`;
            s.async = true;
            s.onload = initAutocomplete;
            document.head.appendChild(s);
        }

        return () => {
            if (autocompleteInstanceRef.current) {
                window.google?.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
            }
        };
    }, [showManualEntry]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError(null);

                const token = localStorage.getItem('supabaseToken');
                const endpoint = `${API_URL}/api/sanity/products`;

                console.log('🔍 DEBUG: Product Fetch Started');
                console.log('📍 API URL:', API_URL);
                console.log('🔑 Token exists?', !!token);
                console.log('📡 Endpoint:', endpoint);

                if (!API_URL) {
                    throw new Error('API_URL is not defined. Check your .env file for VITE_API_URL');
                }

                const res = await fetch(endpoint, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                });

                console.log('📊 Response Status:', res.status);
                console.log('✅ Response OK?', res.ok);

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }

                const json = await res.json();
                console.log('📦 Raw Response:', json);

                const productList = json.products || json || [];
                console.log('📋 Product List:', productList);
                console.log('📊 Product Count:', Array.isArray(productList) ? productList.length : 'Not an array');

                if (!Array.isArray(productList)) {
                    console.error('❌ Product list is not an array:', typeof productList);
                    throw new Error('Invalid product data format - expected array');
                }

                if (productList.length === 0) {
                    console.warn('⚠️ Backend returned empty products array');
                    setProducts([]);
                    setError('No products found in Sanity');
                    return;
                }

                console.log('🔎 First Product:', productList[0]);
                console.log('🔎 First Product Variants:', productList[0]?.variants);

                setProducts(productList);
                console.log('✅ Products loaded successfully');
            } catch (err) {
                console.error('❌ Products fetch error:', err);
                const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
                setError(errorMessage);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const getWholesalePrice = useCallback((price: number): number => {
        return price * (1 - 0.225);
    }, []);

    const getSavingsPercentage = useCallback((price: number, comparePrice: number): number => {
        if (comparePrice <= 0) return 0;
        return Math.round(((comparePrice - price) / comparePrice) * 100);
    }, []);

    const getSelectedVariant = useCallback((product: Product): ProductVariant | null => {
        if (!product?.variants?.length) {
            console.warn(`⚠️ Product ${product?.productId} has no variants`);
            return null;
        }

        const selectedId = selectedVariants[product.productId];
        const selected = selectedId
            ? product.variants.find(v => v.variantId === selectedId)
            : product.variants[0];

        if (!selected) {
            console.warn(`⚠️ Could not find variant ${selectedId} for product ${product.productId}`);
            return null;
        }

        return selected;
    }, [selectedVariants]);

    // ============================================
    // NEW: Fetch shipping options for a product
    // ============================================
    const fetchShippingForCart = useCallback(async (zipCode: string) => {
        if (!zipCode || zipCode.length < 4) return;

        setLoadingShipping('cart');

        try {
            const token = localStorage.getItem("supabaseToken");

            const results = await Promise.all(
                cart.map(async (item) => {
                    const response = await fetch(`${API_URL}/api/postage`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            rate: {
                                destination: { postal_code: zipCode },
                                items: [{ sku: item.sku, quantity: item.quantity }],
                            },
                        }),
                    });

                    const data = await response.json();

                    const standardRate = (data.rates || []).find(
                        (r: any) => r.service_code === 'mills_shipping'
                    );

                    console.log(`📦 Standard rate for SKU [${item.sku}]:`, standardRate);
                    return { sku: item.sku, cost: standardRate?.cost || 0 };
                })
            );

            const totalShipping = results.reduce((sum, r) => sum + r.cost, 0);
            console.log('💰 Total shipping:', totalShipping);
            setShippingFee(totalShipping);

            console.log('🛒 All results:', JSON.stringify(results, null, 2));

        } catch (error) {
            console.error('Error fetching shipping:', error);
        } finally {
            setLoadingShipping(null);
        }
    }, [cart]);

    // ============================================
    // FILTERING & SEARCH
    // ============================================

    const filteredProducts = products.filter(product => {
        const variant = getSelectedVariant(product);

        if (!variant || !variant.inventory) return false;

        const searchLower = filters.searchTerm.toLowerCase().trim();
        if (searchLower) {
            const matchesSearch =
                product.title.toLowerCase().includes(searchLower) ||
                product.vendor?.toLowerCase().includes(searchLower) ||
                variant.sku.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
        }

        if (filters.availability === 'available' && variant.inventory.available === 0) return false;
        if (filters.availability === 'unavailable' && variant.inventory.available > 0) return false;

        if (filters.productType && product.productType !== filters.productType) return false;

        if (filters.vendor && product.vendor !== filters.vendor) return false;

        return true;
    });

    const cartTotal = cart.reduce((sum, item) => sum + getWholesalePrice(item.price) * item.quantity, 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const grandTotal = cartTotal + shippingFee;

    const handleVariantChange = useCallback((product: Product, variantId: number) => {
        setSelectedVariants(prev => ({ ...prev, [product.productId]: variantId }));
        setQuantities(prev => ({ ...prev, [product.productId]: 1 }));
    }, []);

    const handleQuantityChange = (product: Product, delta: number) => {
        const variant = getSelectedVariant(product);
        if (!variant) return;

        setQuantities(prev => {
            const current = prev[product.productId] || 1;
            const newQty = Math.max(1, Math.min(variant.inventory.available, current + delta));
            return { ...prev, [product.productId]: newQty };
        });
    };

    const addToCart = (product: Product) => {
        const variant = getSelectedVariant(product);
        if (!variant || variant.inventory.available === 0) return;

        const quantity = quantities[product.productId] || 1;

        setCart(prev => {
            const existingIdx = prev.findIndex(
                i => i.productId === product.productId && i.variantId === variant.variantId
            );

            if (existingIdx >= 0) {
                const copy = [...prev];
                copy[existingIdx].quantity += quantity;
                return copy;
            }

            return [
                ...prev,
                {
                    productId: product.productId,
                    variantId: variant.variantId,
                    productTitle: product.title,
                    sku: variant.sku,
                    quantity,
                    price: variant.price,
                    compareAtPrice: variant.compareAtPrice,
                    image: variant.imageUrls[0] || product.images,
                },
            ];
        });

        setQuantities(prev => ({ ...prev, [product.productId]: 1 }));
    };

    const updateCartQuantity = (productId: number, variantId: number, delta: number) => {
        setCart(prev =>
            prev
                .map(item => {
                    if (item.productId === productId && item.variantId === variantId) {
                        const newQty = Math.max(0, item.quantity + delta);
                        return newQty === 0 ? null : { ...item, quantity: newQty };
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[]
        );
    };

    const removeFromCart = (productId: number, variantId: number) => {
        setCart(prev => prev.filter(item => !(item.productId === productId && item.variantId === variantId)));
    };

    const cartInitialized = useRef(false);

    // ✅ Load cart from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('wholesaleCart');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setCart(parsed);
                }
            } catch (err) {
                console.error('❌ Failed to parse saved cart:', err);
                localStorage.removeItem('wholesaleCart');
            }
        }
        cartInitialized.current = true;
    }, []);

    // ✅ Save cart to localStorage only after initial load
    useEffect(() => {
        if (!cartInitialized.current) return;
        localStorage.setItem('wholesaleCart', JSON.stringify(cart));
    }, [cart]);
    const handleOpenCheckout = async () => {
        setCheckoutError(null);
        if (cart.length === 0) {
            setCheckoutError("Please add items to your cart");
            return;
        }
        setShowCheckoutModal(true);
        await fetchCompanyLocations();
    };

    const handleSelectLocation = (location: Location) => {
        console.log("📍 Location selected:", location);
        setSelectedLocation(location);

        const zipCode = location.shipping_postcode || '';
        fetchShippingForCart(zipCode); // ✅ replaces old per-item calls
    };

    // NEW: Calculate total shipping
    const calculateTotalShipping = useCallback((): number => {
        return cart.reduce((total, item) => {
            const options = shippingOptions[item.sku];
            if (!options) return total;

            const selectedCode = selectedShippingMethod[item.sku];
            const selected = options.find(
                (o) => o.service_code === selectedCode
            );

            if (selected) {
                // ✅ DO NOT multiply by quantity
                return total + (selected.cost || 0);
            }

            return total;
        }, 0);
    }, [cart, shippingOptions, selectedShippingMethod]);

    // Update shippingFee whenever selections change
    useEffect(() => {
        const totalShipping = calculateTotalShipping();
        setShippingFee(totalShipping);
    }, [calculateTotalShipping]);

    const handleSubmitOrder = async () => {
        console.log('👤 currentUser:', currentUser);

        if (!selectedLocation) {
            setCheckoutError("No shipping location selected.");
            return;
        }

        try {
            setIsSubmittingOrder(true);
            const token = localStorage.getItem("supabaseToken");

            const orderPayload = {
                deliveryAddress: selectedLocation.shipping_address,
                deliveryCity: selectedLocation.shipping_city,
                deliveryProvince: selectedLocation.shipping_state,
                deliveryZip: selectedLocation.shipping_postcode,
                deliveryCountry: 'AU',
                shippingLineTitle: 'Standard Delivery',
                shippingLinePrice: shippingFee.toFixed(2),
                shippingLineCode: 'mills_shipping',
                items: cart.map(item => ({
                    variantId: item.variantId,
                    sku: item.sku,
                    quantity: item.quantity,
                    price: getWholesalePrice(item.price).toFixed(2),
                })),
                subtotal: cartTotal.toFixed(2),
                shippingFee: shippingFee.toFixed(2),
                total: grandTotal.toFixed(2),
                currency: 'AUD',
                locationId: selectedLocation.location_id || selectedLocation.location_id,
                locationName: selectedLocation.location_name || selectedLocation.name,
                companyId: currentUser?.companyId,
                companyName: currentUser?.companyName,
            };

            const res = await fetch(`${API_URL}/api/wholesale-orders/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(orderPayload),
            });

            if (!res.ok) {
                const errData = await res.json();
                console.error('❌ Order error details:', JSON.stringify(errData, null, 2)); // ✅ prints full object
                throw new Error(errData.message || 'Order failed');
            }

            setCart([]);
            setShowCheckoutModal(false);
            setSelectedLocation(null);
            setShippingFee(0);
            setCheckoutError(null);
        } catch (err) {
            console.error(err);
            setCheckoutError('Failed to submit order. Please try again.');
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const closeCheckoutModal = () => {
        setShowCheckoutModal(false);
        setSelectedLocation(null);
        setCheckoutError(null);
        setShippingOptions({});
        setSelectedShippingMethod({});
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 justify-between">
                <div className="min-w-0 flex">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Product List</h2>
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Sidebar Filters */}
                    <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden'} lg:block animate-in fade-in duration-300`}>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-6 sticky top-24 mt-6">
                            <div className="flex items-center justify-between mb-6 lg:block">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-white">Filters</h2>
                                    <button
                                        onClick={handleOpenCheckout}
                                        className="relative p-3 rounded-lg hover:bg-zinc-800 transition-colors group"
                                    >
                                        <ShoppingCart className="w-5 h-5 text-white group-hover:text-indigo-400 transition-colors" />
                                        {cartItemCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                {cartItemCount}
                                            </span>
                                        )}
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="lg:hidden p-1 hover:bg-zinc-800 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Search */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Search
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <input
                                            type="text"
                                            placeholder="Product, SKU, vendor…"
                                            value={filters.searchTerm}
                                            onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                                            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Availability */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-3">
                                        Availability
                                    </label>
                                    <div className="space-y-2">
                                        {[
                                            { value: 'all', label: 'All Products' },
                                            { value: 'available', label: 'In Stock' },
                                            { value: 'unavailable', label: 'Out of Stock' }
                                        ].map(option => (
                                            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="availability"
                                                    value={option.value}
                                                    checked={filters.availability === option.value}
                                                    onChange={e => setFilters(prev => ({ ...prev, availability: e.target.value as any }))}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-sm text-zinc-300">{option.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Product Type */}
                                {productTypes.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-3">
                                            Product Type
                                        </label>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.productType === ''}
                                                    onChange={() => setFilters(prev => ({ ...prev, productType: '' }))}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-sm text-zinc-300">All Types</span>
                                            </label>
                                            {productTypes.map(type => (
                                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={filters.productType === type}
                                                        onChange={() => setFilters(prev => ({ ...prev, productType: filters.productType === type ? '' : type }))}
                                                        className="w-4 h-4 cursor-pointer"
                                                    />
                                                    <span className="text-sm text-zinc-300">{type}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Vendor */}
                                {vendors.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-3">
                                            Vendor
                                        </label>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.vendor === ''}
                                                    onChange={() => setFilters(prev => ({ ...prev, vendor: '' }))}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-sm text-zinc-300">All Vendors</span>
                                            </label>
                                            {vendors.map(vendor => (
                                                <label key={vendor} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={filters.vendor === vendor}
                                                        onChange={() => setFilters(prev => ({ ...prev, vendor: filters.vendor === vendor ? '' : vendor }))}
                                                        className="w-4 h-4 cursor-pointer"
                                                    />
                                                    <span className="text-sm text-zinc-300">{vendor}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Reset Filters */}
                                <button
                                    onClick={() => setFilters({
                                        availability: 'all',
                                        productType: '',
                                        vendor: '',
                                        searchTerm: ''
                                    })}
                                    className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Products Section */}
                    <div className="lg:col-span-4 animate-in fade-in duration-500">
                        {/* Top Bar */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="lg:hidden p-3 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2"
                            >
                                <Filter className="w-5 h-5" />
                                <span className="text-sm">Filters</span>
                            </button>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className="mb-8 p-4 bg-red-950 border border-red-900 rounded-lg flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="text-red-200 font-medium">Error loading products</p>
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Loading State */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-zinc-900 rounded-xl h-96 animate-pulse border border-zinc-800" />
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-16">
                                <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-400 text-lg mb-2">No products found</p>
                                <p className="text-zinc-500 text-sm">Try adjusting your filters or search term</p>
                            </div>
                        ) : (
                            /* Product Grid */
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {filteredProducts.map(product => {
                                    const variant = getSelectedVariant(product);
                                    if (!variant) return null;

                                    const quantity = quantities[product.productId] || 1;
                                    const isAvailable = variant.inventory.available > 0;
                                    const wholesalePrice = getWholesalePrice(variant.price);
                                    const savings = getSavingsPercentage(variant.price, variant.compareAtPrice);

                                    return (
                                        <div
                                            key={product._id}
                                            className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 hover:shadow-lg transition-all duration-300 flex flex-col group h-full"
                                        >
                                            {/* Product Image */}
                                            <div className="relative aspect-auto bg-zinc-800 overflow-hidden flex-shrink-0">
                                                <img
                                                    src={variant.imageUrls[0] || product.images}
                                                    alt={product.title}
                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.currentTarget.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                                                    }}
                                                />
                                                <div className="absolute top-3 right-3 flex flex-col gap-2">
                                                    {isAvailable ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-950 text-green-300 border border-green-900">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            In Stock
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950 text-red-300 border border-red-900">
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                            Out of Stock
                                                        </span>
                                                    )}
                                                    {savings > 0 && (
                                                        <span className="inline-flex px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-900">
                                                            Save {savings}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Product Info */}
                                            <div className="p-5 flex flex-col flex-1">
                                                {/* Title & Meta */}
                                                <div className="h-20 mb-4">
                                                    <h3 className="text-base font-bold text-white mb-1 line-clamp-2">
                                                        {product.title}
                                                    </h3>
                                                    <p className="text-xs text-zinc-500 mb-1">
                                                        SKU: {variant.sku}
                                                    </p>
                                                    {product.vendor && (
                                                        <p className="text-xs text-zinc-400 line-clamp-1">
                                                            {product.vendor}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Variant Selector */}
                                                <div className="h-16 mb-4">
                                                    {product.variants && product.variants.length > 1 && (
                                                        <>
                                                            <label className="block text-xs font-medium text-zinc-400 mb-2">
                                                                Variant
                                                            </label>
                                                            <div className="relative">
                                                                <select
                                                                    value={selectedVariants[product.productId] || product.variants[0].variantId}
                                                                    onChange={e =>
                                                                        handleVariantChange(product, Number(e.target.value))
                                                                    }
                                                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm appearance-none focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                                >
                                                                    {product.variants.map(v => (
                                                                        <option key={v.variantId} value={v.variantId}>
                                                                            {v.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Pricing */}
                                                <div className="h-16 mb-4">
                                                    <div className="flex items-baseline gap-2 mb-1">
                                                        <p className="text-2xl font-bold text-white">
                                                            ${wholesalePrice.toFixed(2)}
                                                        </p>
                                                        <p className="text-sm text-zinc-500 line-through">
                                                            ${variant.compareAtPrice.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-green-400 font-medium mb-2">
                                                        22.5% wholesale discount
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        <span className="font-medium text-zinc-300">
                                                            {variant.inventory.available}
                                                        </span> units available
                                                    </p>
                                                </div>

                                                {/* Quantity Selector */}
                                                <div className="h-16 mb-4">
                                                    {isAvailable && (
                                                        <>
                                                            <label className="block text-xs font-medium text-zinc-400 mb-2">
                                                                Quantity
                                                            </label>
                                                            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
                                                                <button
                                                                    onClick={() => handleQuantityChange(product, -1)}
                                                                    disabled={quantity <= 1}
                                                                    className="p-2 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                    aria-label="Decrease quantity"
                                                                >
                                                                    <Minus className="w-4 h-4" />
                                                                </button>
                                                                <span className="flex-1 text-center font-semibold">
                                                                    {quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleQuantityChange(product, 1)}
                                                                    disabled={quantity >= variant.inventory.available}
                                                                    className="p-2 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                    aria-label="Increase quantity"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Spacer */}
                                                <div className="flex-1"></div>

                                                {/* Add to Cart Button */}
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    disabled={!isAvailable}
                                                    className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${isAvailable
                                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg active:scale-95'
                                                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {isAvailable ? 'Add to Cart' : 'Out of Stock'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* CHECKOUT MODAL */}
            {/* ============================================ */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeCheckoutModal}
                    />

                    {/* Modal */}
                    <div className="relative bg-zinc-900 w-full max-w-2xl border border-zinc-800 z-10 max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Header */}
                        <div className="top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="w-6 h-6 text-indigo-400" />
                                <h2 className="text-2xl font-bold text-white">Order Checkout</h2>
                            </div>
                            <button
                                onClick={closeCheckoutModal}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Error Alert */}
                            {checkoutError && (
                                <div className="p-4 bg-red-950/50 border border-red-900 rounded-lg flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                    <p className="text-red-300 text-sm">{checkoutError}</p>
                                </div>
                            )}

                            {/* Shipping Location */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-indigo-400" />
                                    Shipping Location
                                </h3>

                                {locationLoading ? (
                                    <div className="flex items-center justify-center py-8 bg-zinc-800 rounded-xl">
                                        <Loader className="w-6 h-6 animate-spin text-indigo-400 mr-2" />
                                        <span className="text-zinc-400">Loading locations...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setShowManualEntry(false);
                                                    setManualAddress({ name: '', address: '', city: '', state: '', postcode: '' });
                                                }}
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all border ${!showManualEntry
                                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                                    }`}
                                            >
                                                Saved Locations
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowManualEntry(true);
                                                    setSelectedLocation(null);
                                                    setShippingFee(0);
                                                }}
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all border ${showManualEntry
                                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                                    }`}
                                            >
                                                Enter Manually
                                            </button>
                                        </div>

                                        {!showManualEntry ? (
                                            locations.length === 0 ? (
                                                <div className="bg-zinc-800 rounded-xl p-4 text-center">
                                                    <p className="text-zinc-400 text-sm">No locations available</p>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <select
                                                        value={selectedLocation?._id ? String(selectedLocation._id) : (selectedLocation?.id ? String(selectedLocation.id) : '')}
                                                        onChange={(e) => {
                                                            const selectedValue = e.target.value;
                                                            const loc = locations.find(l => {
                                                                const locId = (l._id || l.id) ? String(l._id || l.id) : '';
                                                                return locId === selectedValue;
                                                            });
                                                            if (loc) handleSelectLocation(loc);
                                                        }}
                                                        className="w-full px-4 py-3 bg-zinc-800 border-2 border-zinc-700 rounded-xl text-white text-sm appearance-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                                    >
                                                        <option value="">— Select a location —</option>
                                                        {locations.map(loc => (
                                                            <option key={String(loc._id || loc.id)} value={String(loc._id || loc.id)}>
                                                                {loc.location_name || loc.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                                </div>
                                            )
                                        ) : (
                                            <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                                        Street Address
                                                        <span className="ml-2 text-indigo-400 font-normal">✦ autocomplete enabled</span>
                                                    </label>
                                                    <input
                                                        ref={autocompleteRef}
                                                        type="text"
                                                        placeholder="Start typing an address…"
                                                        value={manualAddress.address}
                                                        onChange={e => setManualAddress(prev => ({ ...prev, address: e.target.value }))}
                                                        className="w-full px-3 py-2.5 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="hidden">
                                                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">City</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Melbourne"
                                                            value={manualAddress.city}
                                                            onChange={e => setManualAddress(prev => ({ ...prev, city: e.target.value }))}
                                                            className="w-full px-3 py-2.5 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 hidden">
                                                        <div>
                                                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">State</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. VIC"
                                                                value={manualAddress.state}
                                                                onChange={e => setManualAddress(prev => ({ ...prev, state: e.target.value }))}
                                                                className="w-full px-3 py-2.5 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Postcode</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. 3000"
                                                                value={manualAddress.postcode}
                                                                onChange={e => setManualAddress(prev => ({ ...prev, postcode: e.target.value }))}
                                                                className="w-full px-3 py-2.5 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (!manualAddress.address || !manualAddress.postcode) {
                                                            setCheckoutError("Please enter at least a street address and postcode.");
                                                            return;
                                                        }
                                                        setCheckoutError(null);
                                                        const asLocation: Location = {
                                                            name: manualAddress.name || 'Manual Address',
                                                            shipping_address: manualAddress.address,
                                                            shipping_city: manualAddress.city,
                                                            shipping_state: manualAddress.state,
                                                            shipping_postcode: manualAddress.postcode,
                                                        };
                                                        handleSelectLocation(asLocation);
                                                    }}
                                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all"
                                                >
                                                    Use This Address
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Shipping Details - Read Only */}
                            {selectedLocation && (
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Truck className="w-5 h-5 text-indigo-400" />
                                        Shipping Details
                                    </h3>
                                    <div className="bg-zinc-800 rounded-xl p-4">
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Shipping Address</label>
                                        <input
                                            type="text"
                                            value={[
                                                selectedLocation.shipping_address,
                                                selectedLocation.shipping_city,
                                                selectedLocation.shipping_state,
                                                selectedLocation.shipping_postcode,
                                            ].filter(Boolean).join(', ')}
                                            disabled
                                            className="w-full px-4 py-2.5 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm cursor-not-allowed opacity-75"
                                            readOnly
                                        />
                                    </div>
                                </div>
                            )}
                            {/* Order Items */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-indigo-400" />
                                    Order Items
                                </h3>
                                {cart.map(item => (
                                    <div
                                        key={`${item.productId}-${item.variantId}`}
                                        className="bg-zinc-700/50 rounded-lg p-4 border border-zinc-600 hover:border-zinc-500 transition-colors"
                                    >
                                        <div className="flex gap-3">
                                            <img
                                                src={item.image}
                                                alt={item.productTitle}
                                                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://via.placeholder.com/64?text=N/A';
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-white text-sm truncate">
                                                    {item.productTitle}
                                                </p>
                                                <p className="text-xs text-zinc-500 mb-1">SKU: {item.sku}</p>
                                                <p className="text-sm font-bold text-indigo-400">
                                                    ${getWholesalePrice(item.price).toFixed(2)} each
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.productId, item.variantId)}
                                                className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 rounded-lg p-1">
                                                <button
                                                    onClick={() => updateCartQuantity(item.productId, item.variantId, -1)}
                                                    disabled={item.quantity <= 1}
                                                    className="p-1.5 rounded hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Minus className="w-3.5 h-3.5 text-white" />
                                                </button>
                                                <span className="w-8 text-center font-semibold text-white text-sm">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateCartQuantity(item.productId, item.variantId, 1)}
                                                    className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5 text-white" />
                                                </button>
                                            </div>
                                            <p className="font-bold text-white">
                                                ${(getWholesalePrice(item.price) * item.quantity).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Single Shipping Section */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-indigo-400" />
                                    Shipping
                                </h3>
                                <div className="bg-zinc-800 rounded-xl p-4">
                                    {!selectedLocation ? (
                                        <p className="text-sm text-zinc-500 text-center">
                                            Select a shipping location below to calculate shipping
                                        </p>
                                    ) : loadingShipping === 'cart' ? (
                                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Calculating shipping for your cart...
                                        </div>
                                    ) : (
                                        // ✅ Always show once location is selected, even if $0
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white">Standard Delivery</p>
                                                <p className="text-xs text-zinc-400">
                                                    Shipping to {selectedLocation.shipping_postcode}
                                                </p>
                                            </div>
                                            <p className="text-lg font-bold text-green-400">
                                                {shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Order Summary */}
                            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-5 border border-zinc-700">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-400" />
                                    Order Summary
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Subtotal ({cartItemCount} items)</span>
                                        <span className="text-white">${cartTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-zinc-400">Shipping Fee</span>
                                        {loadingShipping === 'cart' ? (
                                            <span className="flex items-center gap-1 text-zinc-400 text-xs">
                                                <Loader className="w-3 h-3 animate-spin" />
                                                Calculating...
                                            </span>
                                        ) : (
                                            <span className="text-white">
                                                {selectedLocation ? `$${shippingFee.toFixed(2)}` : 'Select location'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-zinc-700 mt-3">
                                        <span className="font-bold text-white">Total</span>
                                        <span className="text-2xl font-bold text-green-400">
                                            ${grandTotal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={closeCheckoutModal}
                                    className="flex-1 py-3 border border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitOrder}
                                    disabled={!selectedLocation || isSubmittingOrder}
                                    className={`flex-1 py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${selectedLocation && !isSubmittingOrder
                                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                                        : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                                        }`}
                                >
                                    {isSubmittingOrder ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            ✓ Submit Order
                                            <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;