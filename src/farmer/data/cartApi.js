import axios from 'axios'
import { addLine } from '../lib/cart.js'

// The signed-in farmer's cart lives on the server, like the storefront's.
// Read it, add the line, save it back.
export async function addToServerCart(line) {
  const { data } = await axios.get('/api/cart')
  const items = addLine(data.data, line)
  await axios.put('/api/cart', { items })
  return items
}
