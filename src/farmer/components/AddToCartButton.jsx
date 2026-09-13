import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { addToServerCart } from '../data/cartApi.js'
import { cartLineFor } from '../lib/cart.js'
import { useFarmerT } from '../hooks/useFarmerT.js'

export default function AddToCartButton({ payload }) {
  const { t } = useFarmerT()
  const [adding, setAdding] = useState(false)

  const add = async () => {
    setAdding(true)
    try {
      await addToServerCart(cartLineFor(payload))
      toast.success(t('crop.added', { name: payload.name }), {
        action: { label: t('crop.goToCart'), onClick: () => window.location.assign('/checkout.html') },
      })
    } catch {
      toast.error(t('crop.addFailed'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <button type="button" className="fd-button" onClick={add} disabled={adding}>
      <ShoppingCart size={18} aria-hidden="true" />
      {adding ? t('crop.adding') : t('crop.addToCart')}
      <span className="fd-sr-only">: {payload.name}</span>
    </button>
  )
}
