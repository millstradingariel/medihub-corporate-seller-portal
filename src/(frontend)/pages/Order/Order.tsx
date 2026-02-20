import React, { useState, useEffect } from 'react';
import {
    ShoppingCart,
    Search,
    Package,
    AlertCircle,
    ChevronDown,
    Plus,
    Minus,
    X,
    CheckCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface CartItem {
    productId: number;
    variantId: number;
    title: string;
    variantName: string;
    quantity: number;
    price: number;
    image: string;
    sku: string;
}

interface Product {
    _id: string;
    productId: number;
    variantId: number;
    title: string;
    sku: string;
    images: string[];
    available: number;
    price: number;
    isAvailable: boolean;
    variants?: Array<{
        id: number;
        name: string;
        stock: number;
        price: number;
    }>;
}

const WholesaleOrderingPortal: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCart, setShowCart] = useState(false);
    const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({});
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [filterAvailable, setFilterAvailable] = useState<'All' | 'Available' | 'Unavailable'>('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = localStorage.getItem('firebaseToken');
                const res = await fetch(`${API_URL}/api/sanity/products`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                // Map available → stock
                const mapped: Product[] = (json.products || json || []).map((p: any) => ({
                    ...p,
                    price: p.price ?? p.compareAtPrice ?? 0,
                    available: p.available ?? 0,
                }));
                setProducts(mapped);
            } catch (err) {
                console.error('❌ Products fetch error:', err);
                setError('Failed to load products');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase());
        if (filterAvailable === 'Available') return matchesSearch && product.available > 0;
        if (filterAvailable === 'Unavailable') return matchesSearch && product.available === 0;
        return matchesSearch;
    });

    const getVariant = (product: Product) => {
        if (!product.variants || product.variants.length === 0) {
            return { id: product.variantId, name: 'Default', stock: product.available, price: product.price };
        }
        const selectedId = selectedVariants[product.productId] || product.variants[0].id;
        const variant = product.variants.find(v => v.id === selectedId) || product.variants[0];
        return { ...variant };
    };

    const handleVariantChange = (product: Product, variantId: number) => {
        setSelectedVariants(prev => ({ ...prev, [product.productId]: variantId }));
        setQuantities(prev => ({ ...prev, [product.productId]: 1 }));
    };

    const handleQuantityChange = (product: Product, delta: number) => {
        const variant = getVariant(product);
        setQuantities(prev => {
            const current = prev[product.productId] || 1;
            const newQty = Math.max(1, Math.min(variant.stock, current + delta));
            return { ...prev, [product.productId]: newQty };
        });
    };

    const addToCart = (product: Product) => {
        const variant = getVariant(product);
        if (!variant || variant.stock === 0) return;
        const quantity = quantities[product.productId] || 1;
        setCart(prev => {
            const idx = prev.findIndex(i => i.productId === product.productId && i.variantId === variant.id);
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx].quantity += quantity;
                return copy;
            }
            return [
                ...prev,
                {
                    productId: product.productId,
                    variantId: variant.id,
                    title: product.title,
                    variantName: variant.name,
                    quantity,
                    price: variant.price,
                    image: product.images[0],
                    sku: product.sku,
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

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="bg-gray-900 shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <Package className="w-8 h-8 text-blue-400" />
                            <div>
                                <h1 className="text-xl font-bold">Wholesale Portal</h1>
                                <p className="text-xs text-gray-400">Place your inventory orders</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCart(!showCart)}
                            className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <ShoppingCart className="w-6 h-6 text-white" />
                            {cartItemCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {cartItemCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {/* Search + Filters */}
                    <div className="bg-gray-900 rounded-lg shadow-sm p-4 mb-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search products or SKU..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                />
                            </div>
                            <div className="flex gap-2">
                                {['All', 'Available', 'Unavailable'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilterAvailable(f as any)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            filterAvailable === f
                                                ? f === 'Available'
                                                    ? 'bg-green-600 text-white'
                                                    : f === 'Unavailable'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {filteredProducts.map(product => {
                            const variant = getVariant(product);
                            const quantity = quantities[product.productId] || 1;
                            const isAvailable = variant.stock > 0;

                            return (
                                <div
                                    key={product._id}
                                    className="bg-gray-900 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                >
                                    <div className="relative aspect-square bg-gray-800">
                                        <img
                                            src={product.images[0]}
                                            alt={product.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-3 right-3">
                                            {isAvailable ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Available
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Out of Stock
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold mb-1">{product.title}</h3>
                                        <p className="text-xs text-gray-400 mb-3">SKU: {product.sku}</p>

                                        {product.variants && product.variants.length > 1 && (
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Select Variant
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={selectedVariants[product.productId] || product.variants[0].id}
                                                        onChange={e =>
                                                            handleVariantChange(product, Number(e.target.value))
                                                        }
                                                        className="w-full pl-3 pr-10 py-2 border border-gray-700 rounded-lg appearance-none bg-gray-800 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                                    >
                                                        {product.variants.map(v => (
                                                            <option key={v.id} value={v.id}>
                                                                {v.name} ({v.stock} available)
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        )}

                                        {isAvailable && (
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Quantity
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleQuantityChange(product, -1)}
                                                        disabled={quantity <= 1}
                                                        className="p-2 rounded-lg border border-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="flex-1 text-center font-semibold text-lg">
                                                        {quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleQuantityChange(product, 1)}
                                                        disabled={quantity >= variant.stock}
                                                        className="p-2 rounded-lg border border-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => addToCart(product)}
                                            disabled={!isAvailable}
                                            className={`w-full py-3 rounded-lg font-medium transition-colors ${
                                                isAvailable ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {isAvailable ? 'Add to Cart' : 'Out of Stock'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Cart Sidebar */}
                <div className={`lg:block ${showCart ? 'block' : 'hidden'}`}>
                    <div className="bg-gray-900 rounded-lg shadow-sm p-6 sticky top-24">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Your Order</h2>
                            <button onClick={() => setShowCart(false)} className="lg:hidden p-1 hover:bg-gray-800 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {cart.length === 0 ? (
                            <div className="text-center py-8">
                                <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">Your cart is empty</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                                    {cart.map(item => (
                                        <div key={`${item.productId}-${item.variantId}`} className="flex gap-3 p-3 bg-gray-800 rounded-lg">
                                            <img src={item.image} alt={item.title} className="w-16 h-16 object-cover rounded" />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm truncate">{item.title}</h4>
                                                <p className="text-xs text-gray-400">{item.variantName}</p>
                                                <p className="text-sm font-semibold mt-1">
                                                    ₱{item.price.toFixed(2)} × {item.quantity}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end justify-between">
                                                <button
                                                    onClick={() => removeFromCart(item.productId, item.variantId)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => updateCartQuantity(item.productId, item.variantId, -1)}
                                                        className="p-1 hover:bg-gray-700 rounded"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => updateCartQuantity(item.productId, item.variantId, 1)}
                                                        className="p-1 hover:bg-gray-700 rounded"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-gray-700 pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-lg font-bold">Total</span>
                                        <span className="text-2xl font-bold text-blue-400">
                                            ₱{cartTotal.toFixed(2)}
                                        </span>
                                    </div>
                                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                        Submit Order
                                    </button>
                                    <p className="text-xs text-gray-400 text-center mt-3">
                                        Orders will be added to your monthly invoice
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WholesaleOrderingPortal;