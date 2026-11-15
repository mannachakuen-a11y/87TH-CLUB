import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FREE_SHIPPING_USD, formatPrice, getProduct } from "../data";
import { useStore } from "../store";

export default function BagDrawer() {
  const s = useStore();
  const navigate = useNavigate();
  const close = () => s.setBagOpen(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    if (s.bagOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const remaining = FREE_SHIPPING_USD - s.subtotal;

  return (
    <div className={`drawer-root${s.bagOpen ? " is-open" : ""}`} aria-hidden={!s.bagOpen}>
      <div className="drawer-overlay" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping bag">
        <div className="drawer-head">
          <h2>Shopping Bag{s.count > 0 ? ` (${s.count})` : ""}</h2>
          <button type="button" onClick={close}>
            Close
          </button>
        </div>
        <div className="drawer-body">
          {s.bag.length === 0 ? (
            <p>You have no items in your shopping bag.</p>
          ) : (
            <ul className="bag-lines">
              {s.bag.map((l) => {
                const p = getProduct(l.handle)!;
                return (
                  <li className="bag-line" key={`${l.handle}-${l.size}`}>
                    <Link to={`/products/${p.handle}`} onClick={close} className="bag-thumb">
                      <img src={p.images[0]} alt={`${p.title} in ${p.colour}`} loading="lazy" />
                    </Link>
                    <div className="bag-meta">
                      <div className="bag-row">
                        <Link to={`/products/${p.handle}`} onClick={close}>
                          {p.title}
                        </Link>
                        <span>{formatPrice(p.price * l.qty, s.currency)}</span>
                      </div>
                      <div className="grey">{p.colour}</div>
                      <div className="grey">Size: {l.size}</div>
                      <div className="bag-row bag-controls">
                        <div className="qty" aria-label="Quantity">
                          <button type="button" aria-label="Decrease quantity" onClick={() => s.setQty(l.handle, l.size, l.qty - 1)}>
                            –
                          </button>
                          <span aria-live="polite">{l.qty}</span>
                          <button type="button" aria-label="Increase quantity" disabled={l.qty >= 10} onClick={() => s.setQty(l.handle, l.size, l.qty + 1)}>
                            +
                          </button>
                        </div>
                        <button type="button" className="u" onClick={() => s.remove(l.handle, l.size)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="bag-notes">
            {s.bag.length > 0 && (
              <p>{remaining > 0 ? `You are ${formatPrice(remaining, s.currency)} away from free standard shipping.` : "Your order qualifies for free standard shipping."}</p>
            )}
            <p>Free standard shipping for orders over {formatPrice(FREE_SHIPPING_USD, s.currency)}. Exclusions apply.</p>
            <p>Taxes and duties are calculated at checkout.</p>
          </div>
        </div>
        <div className="drawer-foot">
          {s.bag.length > 0 && (
            <>
              <div className="bag-row bag-subtotal">
                <span>Subtotal</span>
                <span>{formatPrice(s.subtotal, s.currency)}</span>
              </div>
              <div className="bag-row grey">
                <span>Shipping</span>
                <span>{remaining > 0 ? "Calculated at checkout" : "Free"}</span>
              </div>
              <button
                type="button"
                className="btn btn--black"
                onClick={() => {
                  close();
                  navigate("/checkout");
                }}
              >
                Checkout
              </button>
            </>
          )}
          <button type="button" className={`btn ${s.bag.length ? "btn--white" : "btn--black"}`} onClick={close}>
            Continue Shopping
          </button>
        </div>
      </aside>
    </div>
  );
}
