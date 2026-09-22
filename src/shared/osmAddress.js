// OpenStreetMap (Nominatim) address parts -> the checkout's address fields,
// for "Use my current location" (src/storefront/location.js). Returns only
// what was found; a state outside the checkout's list becomes 'Other'.

const strip = (text, words) => String(text || '').replace(new RegExp(`\\s+(${words})$`, 'i'), '').trim()

export function addressFromOsm(a = {}, states = []) {
  const found = {}
  const street = a.road || a.pedestrian || a.residential || ''
  const area = a.village || a.hamlet || a.suburb || a.neighbourhood || a.town || a.city || ''
  const taluk = strip(a.county || a.subdistrict || a.municipality || a.town || a.city || '', 'taluk|tehsil|tahsil|block|mandal')
  const district = strip(a.state_district || a.city_district || a.district || '', 'district')
  const pin = String(a.postcode || '').replace(/\D/g, '')
  if (street) found.street = street
  if (area) found.area = area
  if (taluk) found.taluk = taluk
  if (district) found.district = district
  if (/^\d{6}$/.test(pin)) found.pincode = pin
  if (a.state) found.state = states.find(s => s.toLowerCase() === String(a.state).toLowerCase()) || 'Other'
  return found
}


// Google Maps at an order's GPS point ("Use my current location"), for the
// delivery and admin screens; '' when the order has none.
export function gpsMapsUrl(order) {
  const geo = order?.addressDetails?.geo
  return geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)
    ? `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`
    : ''
}
