import { useState } from "react";
import { Link } from "react-router-dom";
import { FREE_SHIPPING_USD, formatPrice, getProduct } from "../data";
import { useStore } from "../store";

export default function Checkout() {
  const s = useStore();
  const [placed, setPlaced] = useState<string | null>(null);
  const [shipping, setShipping] = useState<"standard" | "express">("standard");
  const shipCost = shipping === "express" ? 25 : s.subtotal >= FREE_SHIPPING_USD ? 0 : 10;
  const tax = Math.round(s.subtotal * 0.08875 * 100) / 100;

  if (placed)
    return (
      <main className="main page" id="main">
        <h1>Thank you</h1>
        <p>Order {placed} has been placed.</p>
        <p className="grey">This is a design prototype: no payment was taken and nothing will ship.</p>
        <p>
          <Link to="/collections/new-arrivals" className="u">Continue shopping</Link>
        </p>
      </main>
    );

  if (!s.bag.length)
    return (
      <main className="main page" id="main">
        <h1>Checkout</h1>
        <p>Your shopping bag is empty.</p>
        <p>
          <Link to="/collections/new-arrivals" className="u">Shop New Arrivals</Link>
        </p>
      </main>
    );

  return (
    <main className="main page checkout" id="main">
      <h1>Checkout</h1>
      <div className="checkout-cols">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            setPlaced(`#87C${Math.floor(100000 + Math.random() * 899999)}`);
            s.clear();
          }}
        >
          <fieldset>
            <legend>Contact</legend>
            <input type="email" required placeholder="Email" autoComplete="email" />
          </fieldset>
          <fieldset>
            <legend>Shipping address</legend>
            <div className="form-row">
              <input required placeholder="First name" autoComplete="given-name" />
              <input required placeholder="Last name" autoComplete="family-name" />
            </div>
            <input required placeholder="Address" autoComplete="address-line1" />
            <div className="form-row">
              <input required placeholder="City" autoComplete="address-level2" />
              <input required placeholder="Postal code" autoComplete="postal-code" />
            </div>
          </fieldset>
          <fieldset>
            <legend>Shipping method</legend>
            <label className="radio">
              <input type="radio" name="ship" checked={shipping === "standard"} onChange={() => setShipping("standard")} /> Standard (3-7 days) —{" "}
              {s.subtotal >= FREE_SHIPPING_USD ? "Free" : formatPrice(10, s.currency)}
            </label>
            <label className="radio">
              <input type="radio" name="ship" checked={shipping === "express"} onChange={() => setShipping("express")} /> Express (1-3 days) — {formatPrice(25, s.currency)}
            </label>
          </fieldset>
          <p className="grey">Prototype checkout: no payment details are collected.</p>
          <button type="submit" className="btn btn--black">
            Place Order
          </button>
        </form>
        <aside className="checkout-summary">
          <ul className="bag-lines">
            {s.bag.map((l) => {
              const p = getProduct(l.handle)!;
              return (
                <li className="bag-line" key={l.handle + l.size}>
                  <div className="bag-thumb">
                    <img src={p.images[0]} alt={`${p.title} in ${p.colour}`} />
                  </div>
                  <div className="bag-meta">
                    <div className="bag-row">
                      <span>{p.title}</span>
                      <span>{formatPrice(p.price * l.qty, s.currency)}</span>
                    </div>
                    <div className="grey">{p.colour}</div>
                    <div className="grey">Size: {l.size} · Qty: {l.qty}</div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="bag-row"><span>Subtotal</span><span>{formatPrice(s.subtotal, s.currency)}</span></div>
          <div className="bag-row"><span>Shipping</span><span>{shipCost ? formatPrice(shipCost, s.currency) : "Free"}</span></div>
          <div className="bag-row"><span>Estimated tax</span><span>{formatPrice(tax, s.currency)}</span></div>
          <div className="bag-row bag-subtotal"><span>Total</span><span>{formatPrice(s.subtotal + shipCost + tax, s.currency)}</span></div>
        </aside>
      </div>
    </main>
  );
}
