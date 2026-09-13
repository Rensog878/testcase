// Farmer dashboard text. The active language comes from LanguageContext;
// languages without an entry here fall back to English, key by key.
// Placeholders are {name}. Counted strings use key_one / key_other.
// strings.test.js checks every English key has a Tamil entry with the same placeholders.

export const FARMER_STRINGS = {
  en: {
    'app.brand': 'Sathya Bio',
    'app.title': 'My Farm',
    'app.skipToContent': 'Skip to main content',
    'app.loading': 'Loading your farm dashboard',

    'nav.label': 'Main',
    'nav.home': 'Home',
    'nav.shop': 'Shop',
    'nav.shopProducts': 'Shop products',
    'nav.farm': 'My Farm',
    'nav.farmShort': 'Farm',
    'nav.cart': 'Cart',
    'nav.orders': 'Orders',
    'nav.trackOrders': 'Track orders',
    'nav.wishlist': 'Wishlist',
    'nav.support': 'Support',

    'account.signOut': 'Sign out',
    'language.label': 'Language',

    'greeting.named': 'Vanakkam, {name}',
    'greeting.anonymous': 'Vanakkam',
    'greeting.subtitle': 'What needs doing today, spraying weather, and your orders.',

    'severity.critical': 'Act today',
    'severity.warning': 'Needs attention',
    'severity.info': 'Information',
    'severity.ok': 'All good',

    'state.loading': 'Loading…',
    'state.retry': 'Try again',
    'state.retrying': 'Trying again…',
    'state.offline': 'You are offline. Showing saved information.',
    'state.refresh_failed': 'Could not refresh. Showing saved information.',
    'state.source_stale': 'Live weather is unavailable. Showing the last forecast we have.',
    'state.partial': 'Some information could not be loaded.',
    'state.old': 'This information may be out of date.',

    'age.now': 'Updated just now',
    'age.minutes_one': 'Updated 1 minute ago',
    'age.minutes_other': 'Updated {count} minutes ago',
    'age.hours_one': 'Updated 1 hour ago',
    'age.hours_other': 'Updated {count} hours ago',
    'age.days_one': 'Updated 1 day ago',
    'age.days_other': 'Updated {count} days ago',

    'actions.title': 'My crop actions',
    'actions.attention': 'Needs your attention',
    'actions.productsFor': 'Recommended for {crop}',
    'actions.products': 'Recommended products',

    'attention.none': 'Nothing needs your action today.',
    'attention.error': 'Could not check your orders or the weather for today.',

    'order.out_for_delivery.title': 'Order {orderId} is out for delivery',
    'order.out_for_delivery.cash': 'Keep {amount} in cash ready.',
    'order.out_for_delivery.paid': 'Already paid online. Nothing to pay at the door.',
    'order.otp': 'Delivery code {otp}. Share it only with the delivery person.',
    'order.delayed.title': 'Order {orderId} is late',
    'order.delayed.detail': 'It was expected by {date}.',
    'order.dispatched_cash_due.title': 'Order {orderId} is on the way',
    'order.dispatched_cash_due.detail': 'Keep {amount} in cash ready for delivery.',
    'order.expected': 'Expected by {date}',
    'order.track': 'Track order',
    'order.contactSupport': 'Contact support',

    'orderStatus.pending': 'Waiting for confirmation',
    'orderStatus.assigned': 'Delivery person assigned',
    'orderStatus.confirmed': 'Confirmed',
    'orderStatus.dispatched': 'On the way',
    'orderStatus.out_for_delivery': 'Out for delivery',
    'orderStatus.delivered': 'Delivered',
    'orderStatus.cancelled': 'Cancelled',
    'orderStatus.delayed': 'Late',
    'orderStatus.unknown': 'Status: {status}',

    'orders.title': 'My orders',
    'orders.empty': 'You have not placed any orders yet.',
    'orders.emptyAction': 'Shop products',
    'orders.error': 'Could not load your orders.',
    'orders.viewAll': 'View all orders',
    'orders.moreItems_one': '+1 more item',
    'orders.moreItems_other': '+{count} more items',
    'orders.total': 'Total {amount}',
    'orders.placedOn': 'Ordered on {date}',
    'orders.itemFallback': 'Product',

    'crop.noCrop': 'Your profile does not have a crop yet, so we cannot suggest products.',
    'crop.noCropAction': 'Shop by crop',
    'crop.noneForCrop': 'No products are listed for {crop} yet.',
    'crop.noneAction': 'Browse all products',
    'crop.error': 'Could not load products.',
    'crop.targets': 'Controls: {list}',
    'crop.dosage': 'Dose on the label: {dosage}',
    'crop.doseForFarm': 'For your {acres}: {amount}',
    'crop.labelCheck': 'Check the product label before use.',
    'crop.pack': 'Pack {pack} · {price}',
    'crop.forAllCrops': 'Suitable for all crops',
    'crop.selectedForYou': 'Selected for you',
    'crop.viewProduct': 'View product',
    'crop.addToCart': 'Add to cart',
    'crop.adding': 'Adding…',
    'crop.added': '{name} added to your cart.',
    'crop.addFailed': 'Could not add to cart. Please try again.',
    'crop.goToCart': 'Go to cart',

    'unit.g': 'g',
    'unit.kg': 'kg',
    'unit.ml': 'ml',
    'unit.L': 'L',

    'weather.title': 'Weather and spraying',
    'weather.near': 'Near {place}',
    'weather.district': '{place} district (approximate)',
    'weather.notYourFarm': 'Not your farm? Ask support to update your village.',
    'weather.locationMissing': 'Your profile has no village or district, so we cannot show weather for your farm.',
    'weather.locationNotFound': 'We could not find "{place}" on the map.',
    'weather.error': 'Could not load the weather.',
    'weather.feelsLike': 'Feels like {temp}',
    'weather.humidity': 'Humidity',
    'weather.wind': 'Wind',
    'weather.rain': 'Rain',
    'weather.rainNextHour': '{amount} in the next hour',
    'weather.showForecast': 'Next 24 hours and 3 days',
    'weather.next24': 'Next 24 hours',
    'weather.next3days': 'Next 3 days',
    'weather.creditsWeather': 'Weather:',
    'weather.creditsMap': 'Map:',
    'weather.seeDetails': 'See weather',

    'spray.safe': 'Safe to spray now',
    'spray.caution': 'Spray with care',
    'spray.avoid': 'Avoid spraying now',
    'spray.safeDetail': 'No rain expected in the next {hours} hours, and wind and heat are within safe limits.',
    'spray.nextWindow': 'Next good time to spray: {day}, {start} to {end}',
    'spray.noWindow': 'No good time to spray in the next {hours} hours.',
    'spray.guidance': 'Advice from the forecast. Always follow the product label.',

    'reason.rain_expected': 'Rain is expected from {time} ({amount}). It may wash the spray off.',
    'reason.rain_possible': 'Some rain is possible from {time} ({amount}).',
    'reason.rain_unknown': 'The rain forecast for the next few hours is not available.',
    'reason.wind_strong': 'Wind is too strong ({speed}). The spray will drift.',
    'reason.wind_moderate': 'Wind is a little strong ({speed}). Spray low, close to the crop.',
    'reason.wind_calm': 'The air is very still ({speed}). Fine droplets can hang and drift.',
    'reason.wind_unknown': 'The wind forecast is not available.',
    'reason.gusts_strong': 'Strong gusts up to {speed}.',
    'reason.too_hot': 'Too hot ({temp}). The spray dries before it works and can scorch leaves.',
    'reason.hot': 'It is hot ({temp}). Early morning or evening is better.',
    'reason.dry_air': 'The air is very dry ({humidity} humidity). Droplets dry quickly.',
    'reason.dark': 'It is dark now. Spray in daylight.',
    'reason.no_forecast': 'There is not enough forecast to check the next {hours} hours.',

    'rain.chance': '{pct}% chance',
    'rain.amount': '{mm} mm',
    'measure.kph': '{value} km/h',

    'condition.clear': 'Clear sky',
    'condition.partly_cloudy': 'Partly cloudy',
    'condition.cloudy': 'Cloudy',
    'condition.fog': 'Fog or haze',
    'condition.light_rain': 'Light rain',
    'condition.rain': 'Rain',
    'condition.heavy_rain': 'Heavy rain',
    'condition.storm': 'Thunderstorm',
    'condition.snow': 'Snow or sleet',
    'condition.unknown': 'Not known',

    'day.today': 'Today',
    'day.tomorrow': 'Tomorrow',

    'farm.title': 'My farm details',
    'farm.crop': 'Crops',
    'farm.area': 'Farm size',
    'farm.acres_one': '1 acre',
    'farm.acres_other': '{count} acres',
    'farm.location': 'Location',
    'farm.notAdded': 'Not added',
    'farm.error': 'Could not load your farm details.',
    'farm.changeHint': 'To change these details, contact Sathya Bio support.',
  },

  ta: {
    'app.brand': 'சத்யா பயோ',
    'app.title': 'என் பண்ணை',
    'app.skipToContent': 'முதன்மை உள்ளடக்கத்திற்குச் செல்லவும்',
    'app.loading': 'உங்கள் பண்ணை பலகை ஏற்றப்படுகிறது',

    'nav.label': 'முதன்மை',
    'nav.home': 'முகப்பு',
    'nav.shop': 'கடை',
    'nav.shopProducts': 'பொருட்கள் வாங்க',
    'nav.farm': 'என் பண்ணை',
    'nav.farmShort': 'பண்ணை',
    'nav.cart': 'கூடை',
    // Short: bottom-bar tabs are about 57px wide on a 360px phone.
    'nav.orders': 'ஆர்டர்',
    'nav.trackOrders': 'ஆர்டர்களைக் கண்காணி',
    'nav.wishlist': 'விருப்பப் பட்டியல்',
    'nav.support': 'உதவி',

    'account.signOut': 'வெளியேறு',
    'language.label': 'மொழி',

    'greeting.named': 'வணக்கம், {name}',
    'greeting.anonymous': 'வணக்கம்',
    'greeting.subtitle': 'இன்று செய்ய வேண்டியவை, தெளிப்புக்கான வானிலை, உங்கள் ஆர்டர்கள்.',

    'severity.critical': 'இன்றே செய்யவும்',
    'severity.warning': 'கவனிக்கவும்',
    'severity.info': 'தகவல்',
    'severity.ok': 'எல்லாம் சரி',

    'state.loading': 'ஏற்றுகிறது…',
    'state.retry': 'மீண்டும் முயலவும்',
    'state.retrying': 'மீண்டும் முயல்கிறது…',
    'state.offline': 'இணைய இணைப்பு இல்லை. சேமித்த தகவல் காட்டப்படுகிறது.',
    'state.refresh_failed': 'புதுப்பிக்க முடியவில்லை. சேமித்த தகவல் காட்டப்படுகிறது.',
    'state.source_stale': 'நேரடி வானிலை கிடைக்கவில்லை. எங்களிடம் உள்ள கடைசி முன்னறிவிப்பு காட்டப்படுகிறது.',
    'state.partial': 'சில தகவல்களை ஏற்ற முடியவில்லை.',
    'state.old': 'இந்தத் தகவல் பழையதாக இருக்கலாம்.',

    'age.now': 'இப்போது புதுப்பிக்கப்பட்டது',
    'age.minutes_one': '1 நிமிடத்திற்கு முன் புதுப்பிக்கப்பட்டது',
    'age.minutes_other': '{count} நிமிடங்களுக்கு முன் புதுப்பிக்கப்பட்டது',
    'age.hours_one': '1 மணி நேரத்திற்கு முன் புதுப்பிக்கப்பட்டது',
    'age.hours_other': '{count} மணி நேரத்திற்கு முன் புதுப்பிக்கப்பட்டது',
    'age.days_one': '1 நாளுக்கு முன் புதுப்பிக்கப்பட்டது',
    'age.days_other': '{count} நாட்களுக்கு முன் புதுப்பிக்கப்பட்டது',

    'actions.title': 'என் பயிர் செயல்கள்',
    'actions.attention': 'உங்கள் கவனம் தேவை',
    'actions.productsFor': '{crop} பயிருக்குப் பரிந்துரைகள்',
    'actions.products': 'பரிந்துரைக்கப்பட்ட பொருட்கள்',

    'attention.none': 'இன்று நீங்கள் செய்ய வேண்டியது எதுவும் இல்லை.',
    'attention.error': 'இன்றைய ஆர்டர்களையும் வானிலையையும் சரிபார்க்க முடியவில்லை.',

    'order.out_for_delivery.title': 'ஆர்டர் {orderId} இன்று டெலிவரிக்கு வருகிறது',
    'order.out_for_delivery.cash': '{amount} பணமாகத் தயாராக வைத்திருங்கள்.',
    'order.out_for_delivery.paid': 'ஆன்லைனில் ஏற்கெனவே செலுத்தப்பட்டது. வாசலில் பணம் தர வேண்டாம்.',
    'order.otp': 'டெலிவரி குறியீடு {otp}. டெலிவரி செய்பவரிடம் மட்டும் சொல்லுங்கள்.',
    'order.delayed.title': 'ஆர்டர் {orderId} தாமதமாகிறது',
    'order.delayed.detail': '{date} அன்றுக்குள் வர வேண்டியது.',
    'order.dispatched_cash_due.title': 'ஆர்டர் {orderId} வழியில் உள்ளது',
    'order.dispatched_cash_due.detail': 'டெலிவரிக்கு {amount} பணமாகத் தயாராக வைத்திருங்கள்.',
    'order.expected': 'எதிர்பார்க்கும் தேதி: {date}',
    'order.track': 'ஆர்டரைக் கண்காணி',
    'order.contactSupport': 'உதவியைத் தொடர்பு கொள்ள',

    'orderStatus.pending': 'உறுதிக்காகக் காத்திருக்கிறது',
    'orderStatus.assigned': 'டெலிவரி செய்பவர் நியமிக்கப்பட்டார்',
    'orderStatus.confirmed': 'உறுதி செய்யப்பட்டது',
    'orderStatus.dispatched': 'வழியில் உள்ளது',
    'orderStatus.out_for_delivery': 'டெலிவரிக்கு வருகிறது',
    'orderStatus.delivered': 'டெலிவரி ஆனது',
    'orderStatus.cancelled': 'ரத்து செய்யப்பட்டது',
    'orderStatus.delayed': 'தாமதம்',
    'orderStatus.unknown': 'நிலை: {status}',

    'orders.title': 'எனது ஆர்டர்கள்',
    'orders.empty': 'நீங்கள் இன்னும் எந்த ஆர்டரும் செய்யவில்லை.',
    'orders.emptyAction': 'பொருட்கள் வாங்க',
    'orders.error': 'உங்கள் ஆர்டர்களை ஏற்ற முடியவில்லை.',
    'orders.viewAll': 'அனைத்து ஆர்டர்களையும் பார்க்க',
    'orders.moreItems_one': 'மேலும் 1 பொருள்',
    'orders.moreItems_other': 'மேலும் {count} பொருட்கள்',
    'orders.total': 'மொத்தம் {amount}',
    'orders.placedOn': '{date} அன்று ஆர்டர் செய்தது',
    'orders.itemFallback': 'பொருள்',

    'crop.noCrop': 'உங்கள் சுயவிவரத்தில் பயிர் இன்னும் இல்லை, அதனால் பொருட்களைப் பரிந்துரைக்க முடியவில்லை.',
    'crop.noCropAction': 'பயிர் வாரியாக வாங்க',
    'crop.noneForCrop': '{crop} பயிருக்கு இன்னும் பொருட்கள் பட்டியலிடப்படவில்லை.',
    'crop.noneAction': 'அனைத்து பொருட்களையும் பார்க்க',
    'crop.error': 'பொருட்களை ஏற்ற முடியவில்லை.',
    'crop.targets': 'கட்டுப்படுத்துவது: {list}',
    'crop.dosage': 'லேபிளில் உள்ள அளவு: {dosage}',
    'crop.doseForFarm': 'உங்கள் {acres} நிலத்திற்கு: {amount}',
    'crop.labelCheck': 'பயன்படுத்தும் முன் பொருளின் லேபிளைப் படிக்கவும்.',
    'crop.pack': 'பேக் {pack} · {price}',
    'crop.forAllCrops': 'அனைத்து பயிர்களுக்கும் ஏற்றது',
    'crop.selectedForYou': 'உங்களுக்காகத் தேர்ந்தெடுக்கப்பட்டது',
    'crop.viewProduct': 'பொருளைப் பார்க்க',
    'crop.addToCart': 'கூடையில் சேர்',
    'crop.adding': 'சேர்க்கிறது…',
    'crop.added': '{name} உங்கள் கூடையில் சேர்க்கப்பட்டது.',
    'crop.addFailed': 'கூடையில் சேர்க்க முடியவில்லை. மீண்டும் முயலவும்.',
    'crop.goToCart': 'கூடைக்குச் செல்ல',

    'unit.g': 'கி',
    'unit.kg': 'கி.கி',
    'unit.ml': 'மி.லி',
    'unit.L': 'லி',

    'weather.title': 'வானிலை மற்றும் தெளிப்பு',
    'weather.near': '{place} அருகில்',
    'weather.district': '{place} மாவட்டம் (தோராயமாக)',
    'weather.notYourFarm': 'இது உங்கள் பண்ணை இல்லையா? கிராமத்தைப் புதுப்பிக்க உதவியைக் கேளுங்கள்.',
    'weather.locationMissing': 'உங்கள் சுயவிவரத்தில் கிராமம் அல்லது மாவட்டம் இல்லை, அதனால் உங்கள் பண்ணையின் வானிலையைக் காட்ட முடியவில்லை.',
    'weather.locationNotFound': '"{place}" இடத்தை வரைபடத்தில் கண்டுபிடிக்க முடியவில்லை.',
    'weather.error': 'வானிலையை ஏற்ற முடியவில்லை.',
    'weather.feelsLike': 'உணர்வு {temp}',
    'weather.humidity': 'ஈரப்பதம்',
    'weather.wind': 'காற்று',
    'weather.rain': 'மழை',
    'weather.rainNextHour': 'அடுத்த 1 மணி நேரத்தில் {amount}',
    'weather.showForecast': 'அடுத்த 24 மணி நேரம் மற்றும் 3 நாட்கள்',
    'weather.next24': 'அடுத்த 24 மணி நேரம்',
    'weather.next3days': 'அடுத்த 3 நாட்கள்',
    'weather.creditsWeather': 'வானிலை:',
    'weather.creditsMap': 'வரைபடம்:',
    'weather.seeDetails': 'வானிலையைப் பார்க்க',

    'spray.safe': 'இப்போது தெளிக்கலாம்',
    'spray.caution': 'கவனத்துடன் தெளிக்கவும்',
    'spray.avoid': 'இப்போது தெளிக்க வேண்டாம்',
    'spray.safeDetail': 'அடுத்த {hours} மணி நேரத்தில் மழை எதிர்பார்க்கப்படவில்லை; காற்றும் வெப்பமும் பாதுகாப்பான அளவில் உள்ளன.',
    'spray.nextWindow': 'தெளிக்க அடுத்த நல்ல நேரம்: {day}, {start} முதல் {end} வரை',
    'spray.noWindow': 'அடுத்த {hours} மணி நேரத்தில் தெளிக்க நல்ல நேரம் இல்லை.',
    'spray.guidance': 'முன்னறிவிப்பின் அடிப்படையிலான ஆலோசனை. எப்போதும் பொருளின் லேபிளைப் பின்பற்றவும்.',

    'reason.rain_expected': '{time} முதல் மழை எதிர்பார்க்கப்படுகிறது ({amount}). மருந்து கழுவப்படலாம்.',
    'reason.rain_possible': '{time} முதல் சிறிது மழை பெய்யலாம் ({amount}).',
    'reason.rain_unknown': 'அடுத்த சில மணி நேர மழை முன்னறிவிப்பு கிடைக்கவில்லை.',
    'reason.wind_strong': 'காற்று மிக வேகமாக உள்ளது ({speed}). மருந்து சிதறிவிடும்.',
    'reason.wind_moderate': 'காற்று சற்று வேகமாக உள்ளது ({speed}). பயிருக்கு அருகில் தாழ்வாகத் தெளிக்கவும்.',
    'reason.wind_calm': 'காற்று மிகவும் அமைதியாக உள்ளது ({speed}). நுண்துளிகள் காற்றில் தங்கிப் பரவலாம்.',
    'reason.wind_unknown': 'காற்று முன்னறிவிப்பு கிடைக்கவில்லை.',
    'reason.gusts_strong': '{speed} வரை பலத்த காற்று வீச்சு.',
    'reason.too_hot': 'மிக அதிக வெப்பம் ({temp}). மருந்து வேலை செய்யும் முன் காய்ந்து, இலைகளைக் கருக்கலாம்.',
    'reason.hot': 'வெப்பமாக உள்ளது ({temp}). அதிகாலை அல்லது மாலை சிறந்தது.',
    'reason.dry_air': 'காற்று மிகவும் வறண்டுள்ளது (ஈரப்பதம் {humidity}). துளிகள் விரைவில் காயும்.',
    'reason.dark': 'இப்போது இருட்டாக உள்ளது. பகலில் தெளிக்கவும்.',
    'reason.no_forecast': 'அடுத்த {hours} மணி நேரத்தைச் சரிபார்க்க போதுமான முன்னறிவிப்பு இல்லை.',

    'rain.chance': '{pct}% வாய்ப்பு',
    'rain.amount': '{mm} மி.மீ',
    'measure.kph': 'மணிக்கு {value} கி.மீ',

    'condition.clear': 'தெளிவான வானம்',
    'condition.partly_cloudy': 'ஓரளவு மேகமூட்டம்',
    'condition.cloudy': 'மேகமூட்டம்',
    'condition.fog': 'மூடுபனி',
    'condition.light_rain': 'லேசான மழை',
    'condition.rain': 'மழை',
    'condition.heavy_rain': 'கனமழை',
    'condition.storm': 'இடியுடன் கூடிய மழை',
    'condition.snow': 'பனி',
    'condition.unknown': 'தெரியவில்லை',

    'day.today': 'இன்று',
    'day.tomorrow': 'நாளை',

    'farm.title': 'என் பண்ணை விவரங்கள்',
    'farm.crop': 'பயிர்கள்',
    'farm.area': 'நில அளவு',
    'farm.acres_one': '1 ஏக்கர்',
    'farm.acres_other': '{count} ஏக்கர்',
    'farm.location': 'இடம்',
    'farm.notAdded': 'சேர்க்கப்படவில்லை',
    'farm.error': 'உங்கள் பண்ணை விவரங்களை ஏற்ற முடியவில்லை.',
    'farm.changeHint': 'இந்த விவரங்களை மாற்ற சத்யா பயோ உதவியைத் தொடர்பு கொள்ளுங்கள்.',
  },
};

const PLACEHOLDER = /\{(\w+)\}/g;

export function translate(lang, key, params) {
  const template = FARMER_STRINGS[lang]?.[key] ?? FARMER_STRINGS.en[key];
  if (template === undefined) return key;
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name) => (params[name] === undefined || params[name] === null ? match : String(params[name])));
}

export function translateCount(lang, key, count, params = {}) {
  return translate(lang, `${key}_${count === 1 ? 'one' : 'other'}`, { ...params, count });
}

export function placeholdersOf(template) {
  return [...template.matchAll(PLACEHOLDER)].map(match => match[1]).sort();
}

const LOCALES = { en: 'en-IN', ta: 'ta-IN' };
const INDIA_TIME_ZONE = 'Asia/Kolkata';
const localeOf = lang => LOCALES[lang] || LOCALES.en;
const isTime = value => typeof value === 'number' && Number.isFinite(value);

export function formatRupees(amount, lang) {
  if (!isTime(amount)) return '';
  return new Intl.NumberFormat(localeOf(lang), {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatNumber(value, lang, maximumFractionDigits = 1) {
  if (!isTime(value)) return '';
  return new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits }).format(value);
}

export function formatDay(timestamp, lang) {
  if (!isTime(timestamp)) return '';
  return new Intl.DateTimeFormat(localeOf(lang), { day: 'numeric', month: 'short', timeZone: INDIA_TIME_ZONE }).format(timestamp);
}

export function formatTime(timestamp, lang) {
  if (!isTime(timestamp)) return '';
  return new Intl.DateTimeFormat(localeOf(lang), { hour: 'numeric', minute: '2-digit', timeZone: INDIA_TIME_ZONE }).format(timestamp);
}

export function formatWeekday(timestamp, lang) {
  if (!isTime(timestamp)) return '';
  return new Intl.DateTimeFormat(localeOf(lang), { weekday: 'long', timeZone: INDIA_TIME_ZONE }).format(timestamp);
}
