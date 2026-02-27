export enum ROLES {
    BUYER = 'buyer',
    SELLER = 'seller',
    ADMIN = 'admin',
}

export enum ORDER_STATUS {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    PACKED = 'packed',
    SHIPPED = 'shipped',
    IN_TRANSIT = 'in_transit',
    OUT_FOR_DELIVERY = 'out_for_delivery',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    RETURNED = 'returned',
    REFUNDED = 'refunded',
    FAILED = 'failed',
}

export enum PAYMENT_STATUS {
    PENDING = 'pending',
    AUTHORIZED = 'authorized',
    CAPTURED = 'captured',
    FAILED = 'failed',
    REFUNDED = 'refunded',
    PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PRODUCT_STATUS {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    INACTIVE = 'inactive',
}

export enum SELLER_STATUS {
    PENDING_VERIFICATION = 'pending_verification',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    SUSPENDED = 'suspended',
}

export enum DOCUMENT_TYPE {
    GST = 'gst',
    PAN = 'pan',
    FSSAI = 'fssai',
    CERTIFICATION = 'certification',
    LAB_REPORT = 'lab_report',
}

export enum BADGE_TYPE {
    VERIFIED = 'verified',
    ORGANIC_CERTIFIED = 'organic_certified',
    LAB_TESTED = 'lab_tested',
    FSSAI_LICENSED = 'fssai_licensed',
}

export enum PAYMENT_METHOD {
    RAZORPAY = 'razorpay',
    UPI = 'upi',
    WALLET = 'wallet',
    COD = 'cod',
}

export enum NOTIFICATION_TYPE {
    ORDER_CONFIRMED = 'order_confirmed',
    ORDER_SHIPPED = 'order_shipped',
    ORDER_DELIVERED = 'order_delivered',
    OTP = 'otp',
    PAYOUT = 'payout',
    LOW_STOCK = 'low_stock',
}

export enum ORDER_ITEM_STATUS {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

export enum CANCELLED_BY {
    USER = 'user',
    SELLER = 'seller',
    ADMIN = 'admin',
    SYSTEM = 'system',
}

export enum RETURN_STATUS {
    NONE = 'none',
    REQUESTED = 'requested',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    COMPLETED = 'completed',
}

export enum REFUND_STATUS {
    NONE = 'none',
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
}

export enum PAYOUT_ITEM_STATUS {
    PENDING = 'pending',
    PROCESSING = 'processing',
    PAID = 'paid',
}

export enum ADDRESS_LABEL {
    HOME = 'home',
    WORK = 'work',
    OTHER = 'other',
}

