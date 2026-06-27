"""SMTP email service — sends transactional emails via the admin-configured SMTP server (default: GoDaddy)."""

import smtplib
import ssl
import logging
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Optional

logger = logging.getLogger("server")


def _send_sync(
    host: str,
    port: int,
    username: str,
    password: str,
    sender: str,
    to: list,
    subject: str,
    html: str,
    reply_to: Optional[str] = None,
    use_ssl: bool = False,
    from_name: str = "CarDost",
) -> bool:
    """Blocking SMTP send. Wrap in asyncio.to_thread when calling from async code.
    `sender` is the From/envelope-from address (can be an alias of the auth mailbox)."""
    if not all([host, port, username, password, sender]) or not to:
        logger.warning("[email] SMTP not fully configured; skipping send")
        return False
    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((from_name, sender))
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        ctx = ssl.create_default_context()
        if use_ssl or int(port) == 465:
            with smtplib.SMTP_SSL(host, int(port), context=ctx, timeout=20) as s:
                s.login(username, password)
                s.sendmail(sender, to, msg.as_string())
        else:
            with smtplib.SMTP(host, int(port), timeout=20) as s:
                s.ehlo()
                s.starttls(context=ctx)
                s.ehlo()
                s.login(username, password)
                s.sendmail(sender, to, msg.as_string())
        logger.info(f"[email] Sent from {sender} to {to}: {subject}")
        return True
    except Exception as e:
        logger.error(f"[email] SMTP send failed: {e}")
        return False


async def send_email(
    settings: dict,
    to,
    subject: str,
    html: str,
    reply_to: Optional[str] = None,
    from_alias: Optional[str] = None,
    from_name: str = "CarDost",
) -> bool:
    """Async wrapper. `from_alias` overrides the default smtp_from.
    Authentication always uses smtp_username/smtp_password (master mailbox)."""
    if not settings or not settings.get("smtp_enabled"):
        return False
    if isinstance(to, str):
        to = [to]
    sender = (
        from_alias or settings.get("smtp_from") or settings.get("smtp_username", "")
    )
    return await asyncio.to_thread(
        _send_sync,
        settings.get("smtp_host", "smtpout.secureserver.net"),
        settings.get("smtp_port", 587),
        settings.get("smtp_username", ""),
        settings.get("smtp_password", ""),
        sender,
        to,
        subject,
        html,
        reply_to,
        bool(settings.get("smtp_use_ssl")),
        from_name,
    )


# ============ Email templates ============

BASE_WRAP = """
<!doctype html><html><head><meta charset="utf-8">
<style>body{{margin:0;background:#f6f5f3;font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:#1c1917}}
.card{{max-width:600px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e7e5e4}}
.hd{{background:#0f172a;color:#fff;padding:24px 28px}}
.hd h1{{margin:0;font-size:22px;letter-spacing:1px;text-transform:uppercase}}
.hd p{{margin:6px 0 0;opacity:.7;font-size:12px}}
.bd{{padding:24px 28px}}
.bd h2{{font-size:16px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px}}
.muted{{color:#78716c;font-size:12px}}
.row{{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f5f5f4}}
.row img{{width:54px;height:54px;border-radius:6px;object-fit:cover;border:1px solid #f5f5f4}}
.row .n{{font-weight:600;font-size:13px}}
.row .v{{color:#78716c;font-size:11px}}
.veh{{display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:2px 6px;border-radius:4px;font-size:10px;margin-top:2px}}
.tot{{margin-top:14px;padding-top:14px;border-top:2px solid #1c1917;display:flex;justify-content:space-between;font-weight:700;font-size:16px}}
.btn{{display:inline-block;background:#4f46e5;color:#fff!important;padding:11px 18px;border-radius:6px;text-decoration:none;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1px}}
.ft{{padding:18px 28px;background:#fafaf9;color:#78716c;font-size:11px;text-align:center;border-top:1px solid #f5f5f4}}
</style></head><body>
<div class="card">
  <div class="hd"><h1>{title}</h1><p>{subtitle}</p></div>
  <div class="bd">{body}</div>
  <div class="ft">CarDost · Premium Car Audio &amp; Accessories<br>Need help? Reply to this email or visit <a href="{base_url}/contact" style="color:#4f46e5">{base_url}/contact</a></div>
</div></body></html>
"""


def _items_html(items, base_url):
    rows = ""
    for i in items:
        img = i.get("image") or ""
        if img and not img.startswith("http"):
            img = base_url + img
        veh = (
            f'<span class="veh">🚗 {i["vehicle_label"]}</span>'
            if i.get("vehicle_label")
            else ""
        )
        rows += f"""<div class="row">
            <img src="{img}" alt="">
            <div style="flex:1">
              <div class="n">{i.get("name", "")}</div>
              {veh}
              <div class="v">Qty {i.get("quantity", "")} × ₹{i.get("price", 0):,.0f}</div>
            </div>
            <div style="font-weight:700">₹{i.get("line_total", 0):,.0f}</div>
          </div>"""
    return rows


def order_confirmation_email(order: dict, base_url) -> tuple:
    """Returns (subject, html) for the customer order confirmation."""
    oid_short = order["id"][:8].upper()
    addr = order.get("address", {})
    items_html = _items_html(order.get("items", []), base_url)
    track_url = f"{base_url}/track-order?order_id={order['id']}"
    body = f"""
      <h2>Thank you, {addr.get("full_name", "Customer")}!</h2>
      <p class="muted">Your order <b>#{oid_short}</b> has been received and is being prepared.</p>
      <p style="margin:18px 0"><a href="{track_url}" class="btn">Track your order →</a></p>
      <h2 style="margin-top:24px">Items</h2>
      {items_html}
      <div class="tot"><span>Total</span><span>₹{order.get("total", 0):,.0f}</span></div>
      <h2 style="margin-top:24px">Shipping address</h2>
      <p style="font-size:13px;line-height:1.5">
        <b>{addr.get("full_name", "")}</b><br>
        {addr.get("line1", "")}{", " + addr.get("line2", "") if addr.get("line2") else ""}<br>
        {addr.get("city", "")}, {addr.get("state", "")} - {addr.get("pincode", "")}<br>
        📞 {addr.get("phone", "")} · ✉ {addr.get("email", "")}
      </p>
      <p class="muted" style="margin-top:18px">Save this email — you can also track at any time at <a href="{track_url}" style="color:#4f46e5">{track_url}</a> using your phone, email or order ID.</p>
    """
    html = BASE_WRAP.format(
        title=f"Order Confirmed · #{oid_short}",
        subtitle="Thanks for shopping with CarDost!",
        body=body,
        base_url=base_url,
    )
    return f"Order #{oid_short} confirmed · CarDost", html


def admin_order_email(order: dict, base_url) -> tuple:
    oid_short = order["id"][:8].upper()
    addr = order.get("address", {})
    items_html = _items_html(order.get("items", []), base_url)
    body = f"""
      <h2>New order #{oid_short}</h2>
      <p class="muted">Amount: <b>₹{order.get("total", 0):,.0f}</b> · Payment: <b>{order.get("payment_status", "pending")}</b></p>
      <h2 style="margin-top:18px">Items</h2>{items_html}
      <h2 style="margin-top:18px">Customer</h2>
      <p style="font-size:13px;line-height:1.5">
        <b>{addr.get("full_name", "")}</b><br>
        {addr.get("line1", "")}{", " + addr.get("line2", "") if addr.get("line2") else ""}<br>
        {addr.get("city", "")}, {addr.get("state", "")} - {addr.get("pincode", "")}<br>
        📞 <a href="tel:{addr.get("phone", "")}" style="color:#4f46e5">{addr.get("phone", "")}</a> · ✉ <a href="mailto:{addr.get("email", "")}" style="color:#4f46e5">{addr.get("email", "")}</a>
      </p>
      <p style="margin-top:18px"><a href="{base_url}/admin" class="btn">Open Admin Dashboard →</a></p>
    """
    html = BASE_WRAP.format(
        title=f"🛒 New Order · #{oid_short}",
        subtitle="Action needed — review &amp; dispatch",
        body=body,
        base_url=base_url,
    )
    return f"🛒 New CarDost Order #{oid_short} · ₹{order.get('total', 0):,.0f}", html


def payment_confirmed_email(order: dict, base_url) -> tuple:
    """Returns (subject, html) for the customer payment confirmation email."""
    oid_short = order["id"][:8].upper()
    addr = order.get("address", {})
    items_html = _items_html(order.get("items", []), base_url)
    track_url = f"{base_url}/track-order?order_id={order['id']}"
    body = f"""
      <h2>Payment confirmed for order #{oid_short}</h2>
      <p class="muted">Your payment has been successfully received.</p>
      <p style="margin-top:14px">We&apos;re now processing your order and will notify you once it ships.</p>
      <p style="margin:18px 0"><a href="{track_url}" class="btn">Track your order →</a></p>
      <h2 style="margin-top:24px">Order details</h2>
      {items_html}
      <div class="tot"><span>Total</span><span>₹{order.get('total', 0):,.0f}</span></div>
      <h2 style="margin-top:24px">Shipping address</h2>
      <p style="font-size:13px;line-height:1.5">
        <b>{addr.get("full_name", "")}</b><br>
        {addr.get("line1", "")}{", " + addr.get("line2", "") if addr.get("line2") else ""}<br>
        {addr.get("city", "")}, {addr.get("state", "")} - {addr.get("pincode", "")}<br>
        📞 {addr.get("phone", "")} · ✉ {addr.get("email", "")}
      </p>
      <p class="muted" style="margin-top:18px">You can also track this order any time at <a href="{track_url}" style="color:#4f46e5">{track_url}</a>.</p>
    """
    html = BASE_WRAP.format(
        title="Payment Confirmed",
        subtitle=f"Order #{oid_short} is paid",
        body=body,
        base_url=base_url,
    )
    return f"Payment received · Order #{oid_short}", html


def admin_contact_email(msg: dict, base_url) -> tuple:
    body = f"""
      <h2>New enquiry from {msg.get("name", "Anonymous")}</h2>
      <p class="muted">Received at {msg.get("created_at", "")[:19].replace("T", " ")} UTC</p>
      <p style="font-size:13px;line-height:1.5">
        📞 <a href="tel:{msg.get("phone", "")}" style="color:#4f46e5">{msg.get("phone", "—")}</a><br>
        ✉ <a href="mailto:{msg.get("email", "")}" style="color:#4f46e5">{msg.get("email", "—")}</a>
      </p>
      <h2 style="margin-top:18px">Message</h2>
      <p style="font-size:13px;line-height:1.5;background:#f5f5f4;padding:12px;border-radius:8px;white-space:pre-wrap">{msg.get("message", "")}</p>
      <p style="margin-top:18px"><a href="mailto:{msg.get("email", "")}?subject=Re:%20Your%20enquiry%20to%20CarDost" class="btn">Reply →</a></p>
    """
    html = BASE_WRAP.format(
        title="📩 New Contact Message",
        subtitle="A customer reached out via /contact",
        body=body,
        base_url=base_url,
    )
    return f"📩 New CarDost enquiry from {msg.get('name', 'Anonymous')}", html


STATUS_COPY = {
    "processing": {
        "emoji": "⚙️",
        "title": "Your order is being prepared",
        "msg": "Our team has started preparing your order. We'll notify you as soon as it ships.",
    },
    "shipped": {
        "emoji": "📦",
        "title": "Your order has shipped!",
        "msg": "Great news — your order is on its way.",
    },
    "delivered": {
        "emoji": "✅",
        "title": "Your order has been delivered",
        "msg": "Hope you love it! Drop us a review on the product page when you can.",
    },
    "cancelled": {
        "emoji": "❌",
        "title": "Your order was cancelled",
        "msg": "Your order has been cancelled. If you paid online, your refund will be processed within 5-7 business days.",
    },
    "paid": {
        "emoji": "💳",
        "title": "Payment received",
        "msg": "Thanks — your payment has been confirmed and your order is being processed.",
    },
}


def order_status_email(order: dict, status: str, base_url) -> tuple:
    """Email customer when order status changes."""
    oid_short = order["id"][:8].upper()
    addr = order.get("address", {})
    copy = STATUS_COPY.get(
        status,
        {
            "emoji": "ℹ️",
            "title": f"Order status: {status}",
            "msg": f"Your order status is now <b>{status}</b>.",
        },
    )
    track_url = f"{base_url}/track-order?order_id={order['id']}"
    sr = order.get("shiprocket") or {}
    tracking_block = ""
    if status == "shipped" and sr.get("awb_code"):
        tracking_block = f"""
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:14px;margin-top:14px">
            <div style="font-size:11px;text-transform:uppercase;font-weight:700;color:#065f46">Tracking</div>
            <div style="font-size:13px;margin-top:4px">AWB: <b>{sr.get("awb_code", "")}</b></div>
            <div style="font-size:13px">Courier: <b>{sr.get("courier_name", "")}</b></div>
            {f'<div style="font-size:13px">Expected by: {sr.get("edd", "")}</div>' if sr.get("edd") else ""}
            {f'<a href="{sr.get("tracking_url", "")}" style="color:#065f46;font-weight:700;font-size:11px;text-transform:uppercase">Track on courier site →</a>' if sr.get("tracking_url") else ""}
          </div>"""
    body = f"""
      <h2>{copy["emoji"]} {copy["title"]}</h2>
      <p class="muted">Order <b>#{oid_short}</b> · {addr.get("full_name", "")}</p>
      <p style="font-size:13px;margin-top:10px">{copy["msg"]}</p>
      {tracking_block}
      <p style="margin:18px 0"><a href="{track_url}" class="btn">View order →</a></p>
    """
    html = BASE_WRAP.format(
        title=f"{copy['emoji']} {copy['title']}",
        subtitle=f"Order #{oid_short}",
        body=body,
        base_url=base_url,
    )
    return f"{copy['emoji']} Order #{oid_short} · {copy['title']}", html


def low_stock_email(items: list, base_url) -> tuple:
    rows = "".join(
        f"<tr><td style='padding:8px;border-bottom:1px solid #e7e5e4'><b>{i['name']}</b><br><span style='font-size:11px;color:#78716c'>ID {i['id'][:8]}</span></td><td style='padding:8px;border-bottom:1px solid #e7e5e4;text-align:right;color:#dc2626;font-weight:700'>{i['stock']} left</td></tr>"
        for i in items
    )
    body = f"""
      <h2>⚠️ Low stock warning</h2>
      <p class="muted">{len(items)} product{"s" if len(items) != 1 else ""} below the safety threshold. Restock soon to avoid lost sales.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">{rows}</table>
      <p style="margin-top:18px"><a href="{base_url}/admin" class="btn">Manage inventory →</a></p>
    """
    html = BASE_WRAP.format(
        title="⚠️ Low Stock Alert",
        subtitle="Inventory needs attention",
        body=body,
        base_url=base_url,
    )
    return (
        f"⚠️ Low stock: {len(items)} product{'s' if len(items) != 1 else ''} need restocking",
        html,
    )


def password_reset_email(reset_link: str, base_url: str) -> tuple:
    body = f"""
      <h2>Reset your CarDost password</h2>
      <p class="muted">We received a request to reset the password for your account.</p>
      <p style="margin:18px 0"><a href="{reset_link}" class="btn">Reset Password</a></p>
      <p style="font-size:13px;line-height:1.5">If the button doesn’t work, copy and paste this link into your browser:</p>
      <p style="font-size:12px;word-break:break-all"><a href="{reset_link}" style="color:#4f46e5">{reset_link}</a></p>
      <p class="muted" style="margin-top:18px">This link will expire in 2 hours. If you didn’t request a reset, you can safely ignore this email.</p>
    """
    html = BASE_WRAP.format(
        title="Password reset request",
        subtitle="Secure your account",
        body=body,
        base_url=base_url,
    )
    return "Reset your CarDost password", html


def abandoned_cart_email(cart: dict, base_url) -> tuple:
    items_html = _items_html(cart.get("items", []), base_url)
    body = f"""
      <h2>Hey {cart.get("name", "") or "there"}, you left some great items behind 👀</h2>
      <p style="font-size:13px">We saved your cart — finish checkout before stock runs out.</p>
      {items_html}
      <p style="margin:18px 0"><a href="{base_url}/checkout" class="btn">Complete your order →</a></p>
      <p class="muted" style="margin-top:14px">Questions? Just reply to this email and our team will help.</p>
    """
    html = BASE_WRAP.format(
        title="🛒 You left items in your cart",
        subtitle="Complete your purchase",
        body=body,
        base_url=base_url,
    )
    return "🛒 You left items in your cart at CarDost", html
