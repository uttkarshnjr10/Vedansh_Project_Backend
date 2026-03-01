/**
 * VanaAushadhi — Frontend API Client Reference
 *
 * This file is NOT used at runtime. It's a type-safe reference for
 * frontend developers to copy interfaces and endpoint constants from.
 *
 * Usage: import types into your React/Next.js/Angular frontend.
 */

// ──────────────────────────────────────────────
// API Configuration
// ──────────────────────────────────────────────

export const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api/v1',
    ENDPOINTS: {
        // Auth
        SEND_OTP: '/auth/send-otp',
        VERIFY_OTP: '/auth/verify-otp',
        REFRESH_TOKEN: '/auth/refresh',
        LOGOUT: '/auth/logout',
        REGISTER: '/auth/register',
        // Users
        MY_PROFILE: '/users/profile',
        MY_ADDRESSES: '/users/addresses',
        MY_SESSIONS: '/users/sessions',
        // Categories
        CATEGORIES: '/categories',
        CATEGORY_DETAIL: (slug: string) => `/categories/${slug}`,
        // Products
        PRODUCTS: '/products',
        PRODUCT_DETAIL: (slug: string) => `/products/${slug}`,
        PRODUCT_REVIEWS: (id: string) => `/products/${id}/reviews`,
        SEARCH_SUGGESTIONS: '/products/search/suggestions',
        // Cart
        CART: '/cart',
        CART_ADD: '/cart/add',
        CART_ITEMS: '/cart/items',
        CART_CLEAR: '/cart/clear',
        CART_VALIDATE: '/cart/validate',
        CART_APPLY_COUPON: '/cart/validate-coupon',
        CART_LOYALTY: '/cart/loyalty-points',
        CART_CALCULATE_LOYALTY: '/cart/calculate-loyalty',
        // Wishlist
        WISHLIST: '/wishlist',
        // Orders
        ORDERS: '/orders',
        ORDER_DETAIL: (id: string) => `/orders/${id}`,
        ORDER_CANCEL: (id: string) => `/orders/${id}/cancel`,
        ORDER_RETURN: '/orders/return-item',
        // Payments
        PAYMENT_VERIFY: '/payments/verify',
        PAYMENT_DETAIL: (orderId: string) => `/payments/orders/${orderId}`,
        WALLET_HISTORY: '/payments/wallet/history',
        // Notifications
        NOTIFICATIONS: '/notifications',
        NOTIFICATIONS_UNREAD_COUNT: '/notifications/unread-count',
        NOTIFICATION_READ: (id: string) => `/notifications/${id}/read`,
        NOTIFICATIONS_READ_ALL: '/notifications/read-all',
        // Sellers
        SELLER_REGISTER: '/sellers/register',
        SELLER_PROFILE: '/sellers/my/profile',
        SELLER_PRODUCTS: '/sellers/my/products',
        SELLER_ORDERS: '/sellers/my/orders',
        SELLER_DASHBOARD: '/sellers/my/dashboard',
        SELLER_ANALYTICS: '/sellers/my/analytics',
        SELLER_DOCUMENTS: '/sellers/my/documents',
        // Admin
        ADMIN_DASHBOARD: '/admin/dashboard',
        ADMIN_SELLERS: '/admin/sellers',
        ADMIN_SELLERS_PENDING: '/admin/sellers/pending',
        ADMIN_PRODUCTS: '/admin/products',
        ADMIN_PRODUCTS_PENDING: '/admin/products/pending',
        ADMIN_ORDERS: '/admin/orders',
        ADMIN_USERS: '/admin/users',
        ADMIN_COUPONS: '/admin/coupons',
        ADMIN_ANALYTICS_REVENUE: '/admin/analytics/revenue',
        ADMIN_ANALYTICS_DASHBOARD: '/admin/analytics/dashboard',
        ADMIN_PAYOUTS_TRIGGER: '/admin/payouts/trigger-weekly',
    },
} as const;

// ──────────────────────────────────────────────
// Response Wrappers
// ──────────────────────────────────────────────

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
    meta?: {
        timestamp: string;
        path: string;
        requestId: string;
    };
}

export interface PaginatedResponse<T> {
    items: T[];
    meta: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface ErrorResponse {
    success: false;
    statusCode: number;
    message: string;
    requestId: string;
    errors?: string[];
    timestamp: string;
}

// ──────────────────────────────────────────────
// Entity Interfaces (response shapes)
// ──────────────────────────────────────────────

export interface UserProfile {
    id: string;
    phone: string;
    email: string | null;
    fullName: string;
    role: 'buyer' | 'seller' | 'admin';
    avatar: string | null;
    walletBalance: number;
    loyaltyPoints: number;
    isActive: boolean;
    createdAt: string;
}

export interface UserAddress {
    id: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
    landmark: string | null;
    label: 'home' | 'work' | 'other';
    isDefault: boolean;
}

export interface CategorySummary {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    icon: string | null;
    displayOrder: number;
    subcategories?: SubcategorySummary[];
}

export interface SubcategorySummary {
    id: string;
    name: string;
    slug: string;
}

export interface ProductSummary {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    price: number;
    salePrice: number | null;
    thumbnailUrl: string | null;
    avgRating: number;
    reviewCount: number;
    stockQuantity: number;
    badges: string[];
    seller: { id: string; brandName: string };
    category: { id: string; name: string; slug: string };
}

export interface ProductDetail extends ProductSummary {
    description: string;
    ingredients: string | null;
    howToUse: string | null;
    weight: string | null;
    dimensions: string | null;
    sku: string;
    tags: string[];
    images: ProductImage[];
    certificates: ProductCertificate[];
}

export interface ProductImage {
    id: string;
    url: string;
    altText: string | null;
    displayOrder: number;
    isPrimary: boolean;
}

export interface ProductCertificate {
    id: string;
    name: string;
    imageUrl: string;
    issuingAuthority: string | null;
}

export interface ProductReview {
    id: string;
    rating: number;
    comment: string;
    user: { id: string; fullName: string; avatar: string | null };
    createdAt: string;
}

export interface CartItem {
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    thumbnailUrl: string | null;
    price: number;
    salePrice: number | null;
    quantity: number;
    stockQuantity: number;
    sellerName: string;
}

export interface CartSummary {
    items: CartItem[];
    itemCount: number;
    subtotal: number;
}

export interface CouponValidation {
    isValid: boolean;
    couponCode: string;
    discountType: 'percentage' | 'fixed_amount' | 'free_delivery';
    discountAmount: number;
    finalAmount: number;
    message: string;
}

export interface LoyaltyInfo {
    points: number;
    monetaryValue: number;
}

export interface OrderSummary {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    totalAmount: number;
    itemCount: number;
    createdAt: string;
    estimatedDeliveryDate: string | null;
}

export interface OrderDetail extends OrderSummary {
    subtotal: number;
    deliveryCharge: number;
    discountAmount: number;
    loyaltyPointsUsed: number;
    loyaltyPointsValue: number;
    paymentMethod: 'razorpay' | 'upi' | 'wallet' | 'cod';
    razorpayOrderId: string | null;
    trackingId: string | null;
    logisticsPartner: string | null;
    cancellationReason: string | null;
    notes: string | null;
    items: OrderItemDetail[];
    address: OrderAddress;
}

export interface OrderItemDetail {
    id: string;
    productName: string;
    productSlug: string;
    productImageUrl: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sellerName: string;
    itemStatus: string;
}

export interface OrderAddress {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
}

export interface PaymentDetails {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    paidAt: string | null;
}

export interface WalletTransaction {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    referenceType: string;
    referenceId: string | null;
    createdAt: string;
}

export interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string;
    data: Record<string, unknown> | null;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
}

export interface SellerProfile {
    id: string;
    brandName: string;
    businessType: 'individual' | 'company' | 'farm' | 'cooperative';
    status: 'pending_verification' | 'approved' | 'rejected' | 'suspended';
    avgRating: number;
    totalProductsSold: number;
    commissionRate: number;
    createdAt: string;
}

export interface SellerAnalytics {
    period: 'week' | 'month' | 'year';
    revenue: number;
    totalOrders: number;
    unitsSold: number;
    topProducts: Array<{ name: string; sold: number; revenue: number }>;
}

export interface AdminDashboardStats {
    today: { revenue: number; orders: number };
    thisMonth: { revenue: number; orders: number };
    allTime: {
        totalRevenue: number;
        totalOrders: number;
        totalSellers: number;
        totalBuyers: number;
        totalProducts: number;
    };
    revenueChart: Array<{ date: string; revenue: number; orders: number }>;
    topSellingProducts: Array<{ name: string; totalSold: number; totalRevenue: number }>;
    pendingApprovals: { sellers: number; products: number };
    recentOrders: OrderSummary[];
}

// ──────────────────────────────────────────────
// Enums (mirror backend constants)
// ──────────────────────────────────────────────

export type OrderStatus =
    | 'pending' | 'confirmed' | 'processing' | 'packed'
    | 'shipped' | 'in_transit' | 'out_for_delivery'
    | 'delivered' | 'cancelled' | 'returned' | 'refunded' | 'failed';

export type PaymentStatus =
    | 'pending' | 'authorized' | 'captured'
    | 'failed' | 'refunded' | 'partially_refunded';

export type PaymentMethod = 'razorpay' | 'upi' | 'wallet' | 'cod';

// ──────────────────────────────────────────────
// API Client Helper
// ──────────────────────────────────────────────

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public requestId?: string,
        public details?: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit & {
        token?: string;
        params?: Record<string, string | number | boolean | undefined>;
    } = {},
): Promise<ApiResponse<T>> {
    const { token, params, ...fetchOptions } = options;

    let url = `${API_CONFIG.BASE_URL}${endpoint}`;
    if (params) {
        const filtered = Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => [k, String(v)]);
        if (filtered.length > 0) {
            url += `?${new URLSearchParams(filtered).toString()}`;
        }
    }

    const response = await fetch(url, {
        ...fetchOptions,
        credentials: 'include', // for httpOnly refresh token cookie
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(fetchOptions.headers as Record<string, string>),
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
            response.status,
            error.message || 'Request failed',
            error.requestId,
            error,
        );
    }

    return response.json();
}

// ──────────────────────────────────────────────
// Usage Examples (for frontend devs)
// ──────────────────────────────────────────────

/*
// --- Send OTP ---
const { data } = await apiRequest('/auth/send-otp', {
  method: 'POST',
  body: JSON.stringify({ phone: '9876543210' }),
});

// --- Login (returns accessToken + sets httpOnly cookie) ---
const { data: loginData } = await apiRequest<{ accessToken: string; user: UserProfile }>(
  '/auth/verify-otp',
  { method: 'POST', body: JSON.stringify({ phone: '9876543210', otp: '123456' }) },
);
const token = loginData.accessToken;

// --- Get Products (paginated) ---
const products = await apiRequest<PaginatedResponse<ProductSummary>>(
  API_CONFIG.ENDPOINTS.PRODUCTS,
  { token, params: { page: 1, limit: 20, category: 'personal-care', sort: 'popular' } },
);

// --- Add to Cart ---
await apiRequest(API_CONFIG.ENDPOINTS.CART_ADD, {
  method: 'POST', token,
  body: JSON.stringify({ productId: 'uuid-here', quantity: 2 }),
});

// --- Create Order (Razorpay flow) ---
const { data: order } = await apiRequest<OrderDetail>(API_CONFIG.ENDPOINTS.ORDERS, {
  method: 'POST', token,
  body: JSON.stringify({ addressId: 'uuid', paymentMethod: 'razorpay' }),
});
// Then open Razorpay modal with order.razorpayOrderId

// --- Verify Payment (after Razorpay modal closes) ---
await apiRequest(API_CONFIG.ENDPOINTS.PAYMENT_VERIFY, {
  method: 'POST', token,
  body: JSON.stringify({
    razorpayOrderId: 'order_xyz',
    razorpayPaymentId: 'pay_xyz',
    razorpaySignature: 'sig_xyz',
  }),
});
*/
