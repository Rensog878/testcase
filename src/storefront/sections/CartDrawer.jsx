import { memo } from 'react'
import { useStore } from '../StoreContext'
import { productImage, rupees, useFallbackImage } from '../data'

// The basket drawer. Checkout itself is the /checkout page.
export default memo(function CartDrawer({ open, cart, count, subtotal, gst, total }) {
  const { setCartOpen, updateQty, removeFromCart, goToCheckout, scrollToCatalog } = useStore()

  return (
    <div className={`cart-drawer-overlay${open ? ' active' : ''}`} id="cartOverlay" onClick={event => { if (event.target === event.currentTarget) setCartOpen(false) }}>
      <div className={`cart-drawer${cart.length === 0 ? ' is-empty' : ''}`} role="dialog" aria-modal="true" aria-labelledby="cartDrawerTitle">
        <div className="cart-header">
          <div className="cart-header-title">
            <h3 id="cartDrawerTitle"><i className="fa-solid fa-bag-shopping"></i> Your Basket</h3>
            <span className="cart-header-count" id="cartItemCount">{count} {count === 1 ? 'item' : 'items'}</span>
          </div>
          <button className="cart-close-btn" id="cartCloseBtn" aria-label="Close basket" onClick={() => setCartOpen(false)}>&times;</button>
        </div>

        <div className="cart-items-container" id="cartItemsContainer">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon"><i className="fa-solid fa-basket-shopping"></i></div>
              <h4>Your basket is empty</h4>
              <p>Add crop protection products to get started.</p>
              <button type="button" className="btn btn-primary" onClick={() => { setCartOpen(false); scrollToCatalog() }}>Browse products</button>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div className="cart-item" key={`${item.id}-${item.selectedPack || ''}-${idx}`}>
                <div className="cart-item-thumb"><img loading="lazy" decoding="async" src={productImage(item)} alt={item.name} onError={useFallbackImage} /></div>
                <div className="cart-item-body">
                  <h4 className="cart-item-name">{item.name}</h4>
                  <div className="cart-item-meta">
                    {item.selectedPack && <span className="cart-item-pack">{item.selectedPack}</span>}
                    <span>{rupees(item.price)} each</span>
                  </div>
                  <div className="cart-item-foot">
                    <div className="cart-stepper" role="group" aria-label="Quantity">
                      <button type="button" onClick={() => updateQty(idx, -1)} aria-label={item.qty <= 1 ? 'Remove item' : 'Decrease quantity'}>
                        <i className={`fa-solid ${item.qty <= 1 ? 'fa-trash-can' : 'fa-minus'}`}></i>
                      </button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(idx, 1)} aria-label="Increase quantity"><i className="fa-solid fa-plus"></i></button>
                    </div>
                    <strong className="cart-item-total">{rupees(item.price * item.qty)}</strong>
                  </div>
                </div>
                <button type="button" className="cart-item-remove" onClick={() => removeFromCart(idx)} aria-label="Remove from basket"><i className="fa-solid fa-xmark"></i></button>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-summary">
            <div className="cart-summary-row"><span>Subtotal</span><span id="cartSubtotal">{rupees(subtotal)}</span></div>
            <div className="cart-summary-row"><span>GST (18%)</span><span id="cartGst">{rupees(gst)}</span></div>
            <div className="cart-summary-row"><span>Delivery</span><span className="cart-free">FREE</span></div>
            <div className="cart-summary-row grand-total"><span>Total</span><span id="cartDrawerTotal">{rupees(total)}</span></div>
          </div>

          <button className="btn btn-primary cart-checkout-btn" id="checkoutBtn" onClick={event => { event.preventDefault(); goToCheckout() }}>
            <span><i className="fa-solid fa-lock"></i> Checkout</span>
            <span className="cart-checkout-amount" id="cartCheckoutAmount">{rupees(total)}</span>
          </button>
          <p className="cart-secure-note"><i className="fa-solid fa-shield-halved"></i> Secure payment · UPI, cards or cash on delivery</p>
        </div>
      </div>
    </div>
  )
})
