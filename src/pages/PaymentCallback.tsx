import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ordersApi, paymentsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const oid = searchParams.get("orderId");
    if (!oid) {
      setStatus("failed");
      return;
    }
    setOrderId(oid);
    processPaymentResult(oid);
  }, [searchParams]);

  const processPaymentResult = async (oid: string) => {
    try {
      // Verify payment status via backend
      await paymentsApi.create(oid);
      // If payment creation succeeds, the order is still pending (new payment session created)
      // Now check the actual order
    } catch {
      // Payment may have already been processed via webhook
    }

    try {
      const orderData = await ordersApi.getById(oid);
      setOrder(orderData);

      if (orderData.payment?.status === "SUCCESS" || orderData.status === "PAID") {
        setStatus("success");
      } else {
        // Payment still pending or failed
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Verifying your payment...</h1>
          <p className="text-sm text-muted-foreground">Please wait while we confirm your payment</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-2" />
            <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              {order && (
                <>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Order</span>
                    <span className="font-mono">#{orderId?.slice(0, 8)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold">{order.finalAmount.toLocaleString()} ETB</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-green-600 font-medium">{order.status}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{order.deliveryType}</span>
                  </p>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              We'll notify you when your order is being processed. You can chat with us anytime from the order details page.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Continue Shopping
              </Button>
              <Button className="flex-1" onClick={() => navigate(`/orders/${orderId}`)}>
                View Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
          <CardTitle className="text-2xl text-red-600">Payment Not Completed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
            {order && (
              <>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-mono">#{orderId?.slice(0, 8)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">{order.finalAmount.toLocaleString()} ETB</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-yellow-600 font-medium">{order.status}</span>
                </p>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {order?.payment?.status === "FAILED"
              ? "Your payment was declined by the payment gateway. Please try again or contact support."
              : "Payment verification timed out. Your order is still pending."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Home
            </Button>
            <Button className="flex-1" onClick={() => navigate(`/orders/${orderId}`)}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallback;
