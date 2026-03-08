import { TF_MINUTES } from './constants'

/** Per-symbol simulation parameters */
const SEEDS = {
  'EUR/USD':  { price: 1.0850, vol: 0.0008, drift: 0.000005 },
  'GBP/USD':  { price: 1.2650, vol: 0.0012, drift: 0.000008 },
  'USD/JPY':  { price: 149.50, vol: 0.15,   drift: 0.002    },
  'AUD/USD':  { price: 0.6580, vol: 0.0007, drift: 0.000004 },
  'USD/CAD':  { price: 1.3650, vol: 0.0008, drift: 0.000006 },
  'USD/CHF':  { price: 0.9050, vol: 0.0007, drift: 0.000005 },
  'NZD/USD':  { price: 0.6050, vol: 0.0007, drift: 0.000004 },
  'EUR/GBP':  { price: 0.8580, vol: 0.0006, drift: 0.000003 },
  'EUR/JPY':  { price: 162.00, vol: 0.18,   drift: 0.002    },
  'GBP/JPY':  { price: 189.00, vol: 0.22,   drift: 0.003    },
  'BTC/USD':  { price: 67000,  vol: 900,    drift: 8        },
  'ETH/USD':  { price: 3400,   vol: 70,     drift: 2        },
  'BNB/USD':  { price: 590,    vol: 8,      drift: 0.2      },
  'XRP/USD':  { price: 0.58,   vol: 0.008,  drift: 0.0001   },
  'SOL/USD':  { price: 170,    vol: 4,      drift: 0.1      },
  'ADA/USD':  { price: 0.45,   vol: 0.006,  drift: 0.0001   },
  'DOGE/USD': { price: 0.12,   vol: 0.003,  drift: 0.00005  },
  'MATIC/USD':{ price: 0.72,   vol: 0.012,  drift: 0.0002   },
  'DOT/USD':  { price: 7.50,   vol: 0.12,   drift: 0.002    },
  'LTC/USD':  { price: 82,     vol: 1.5,    drift: 0.03     },
  'XAU/USD':  { price: 2350,   vol: 12,     drift: 0.4      },
  'XAG/USD':  { price: 28.5,   vol: 0.3,    drift: 0.005    },
  'WTI/USD':  { price: 78.5,   vol: 0.9,    drift: 0.015    },
  'SPX500':   { price: 5200,   vol: 28,     drift: 1        },
  'US30':     { price: 39500,  vol: 160,    drift: 5        },
  'NAS100':   { price: 18200,  vol: 120,    drift: 4        },
  'GER40':    { price: 18800,  vol: 100,    drift: 3        },
}

/**
 * Generate synthetic OHLCV bars using a seeded geometric Brownian motion
 * approximation. This is used as a fallback when the real API is unavailable
 * or rate-limited.
 *
 * @param {string} symbol  - e.g. 'EUR/USD'
 * @param {string} timeframe - e.g. '1h'
 * @param {number} bars    - number of candles to generate
 * @returns {OHLCVBar[]}
 */
export function generateMockOHLCV(symbol, timeframe, bars = 800) {
  const tf  = TF_MINUTES[timeframe] || 60
  const now = Date.now()
  const start = now - bars * tf * 60_000
  const seed  = SEEDS[symbol] ?? { price: 1.0, vol: 0.001, drift: 0 }

  let price = seed.price
  const data = []

  for (let i = 0; i < bars; i++) {
    const time   = start + i * tf * 60_000
    const open   = price
    const dir    = Math.random() > 0.5 ? 1 : -1
    const range  = seed.vol * (0.8 + Math.random() * 1.4)
    const close  = open + dir * range * (0.3 + Math.random() * 0.7)
    const wHigh  = Math.abs(range) * Math.random() * 0.5
    const wLow   = Math.abs(range) * Math.random() * 0.5
    const high   = Math.max(open, close) + wHigh
    const low    = Math.min(open, close) - wLow
    const volume = Math.floor(800 + Math.random() * 12000)

    data.push({ time, open, high, low, close, volume })
    price = close + seed.drift * dir * Math.random()
  }

  return data
}
