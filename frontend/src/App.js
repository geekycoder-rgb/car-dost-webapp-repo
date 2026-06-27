import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Signup from "@/pages/Signup";
import MyOrders from "@/pages/MyOrders";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import OrderDetail from "@/pages/OrderDetail";
import Wishlist from "@/pages/Wishlist";
import TrackOrder from "@/pages/TrackOrder";
import Reviews from "@/pages/Reviews";
import About from "@/pages/About";
import FAQ from "@/pages/FAQ";
import Contact from "@/pages/Contact";

export default function App() {
  return (
    <div className="App">
        <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/order/:id" element={<OrderDetail />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/about" element={<About />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/contact" element={<Contact />} />
              </Routes>
            </Layout>
            <Toaster position="top-right" theme="light" richColors/>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
