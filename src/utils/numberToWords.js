// Converts a numeric amount (e.g. 50997.00) to Indian Rupee words
// e.g. "Indian Rupee Fifty Thousand Nine Hundred Ninety Seven Only"
// e.g. 3340.98 -> "Indian Rupee Three Thousand Three Hundred Forty And Ninety Eight paisa Only"

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ONES[n % 10] : '');
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

export function numberToIndianWords(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Indian Rupee Zero Only';

  const num = Math.abs(Number(amount));
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return 'Indian Rupee Zero Only';
  }

  let words = '';

  // Indian Numbering System: Crores (1,00,00,000), Lakhs (1,00,00,00), Thousands (1,000), Hundreds (100)
  const crores = Math.floor(integerPart / 10000000);
  const remainderAfterCrore = integerPart % 10000000;

  const lakhs = Math.floor(remainderAfterCrore / 100000);
  const remainderAfterLakh = remainderAfterCrore % 100000;

  const thousands = Math.floor(remainderAfterLakh / 1000);
  const remainderAfterThousand = remainderAfterLakh % 1000;

  if (crores > 0) {
    words += convertBelowThousand(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    words += convertBelowThousand(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    words += convertBelowThousand(thousands) + ' Thousand ';
  }
  if (remainderAfterThousand > 0) {
    words += convertBelowThousand(remainderAfterThousand) + ' ';
  }

  words = words.trim();
  if (!words) words = 'Zero';

  let result = `Indian Rupee ${words}`;

  if (decimalPart > 0) {
    const paiseWords = convertBelowThousand(decimalPart);
    result += ` And ${paiseWords} paisa Only`;
  } else {
    result += ' Only';
  }

  return result;
}

export default numberToIndianWords;
