import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function prefillFromExtractions(extractions = []) {
  // Find first extraction that has useful trading data
  const first = extractions.find(e =>
    e.symbol || e.qty_mentioned || e.price_mentioned ||
    ['BUY_ORDER', 'SELL_ORDER', 'QTY_PRICE', 'CONDITIONAL_ORDER', 'PRICE_MENTION', 'PRICE_RANGE'].includes((e.type || '').toUpperCase())
  ) || extractions[0] || {};

  return {
    symbol: first.symbol || '',
    qty: first.qty_mentioned != null ? String(first.qty_mentioned) : '',
    price: first.price_mentioned != null ? String(first.price_mentioned) : '',
    orderType: 'Market',
  };
}

export default function OrderForm({ extractions = [], onDismiss, onPlaceOrder }) {
  const prefill = prefillFromExtractions(extractions);
  const [symbol, setSymbol] = useState(prefill.symbol);
  const [qty, setQty] = useState(prefill.qty);
  const [price, setPrice] = useState(prefill.price);
  const [orderType, setOrderType] = useState(prefill.orderType);

  const handleSubmit = () => {
    onPlaceOrder({ symbol, qty, price, orderType });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
            <ShoppingCart className="w-4 h-4" />
            Place Order <span className="font-normal text-blue-500 text-xs">(Optional)</span>
          </div>
          <button onClick={onDismiss} className="text-blue-400 hover:text-blue-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-xs text-blue-700 font-medium mb-1 block">Stock Symbol</label>
            <Input
              placeholder="e.g. RELIANCE"
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className="bg-white border-blue-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-blue-700 font-medium mb-1 block">Quantity</label>
            <Input
              type="number"
              placeholder="e.g. 100"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="bg-white border-blue-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-blue-700 font-medium mb-1 block">Price</label>
            <Input
              type="number"
              placeholder="e.g. 2450"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="bg-white border-blue-200 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-blue-700 font-medium mb-1 block">Order Type</label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger className="bg-white border-blue-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Market">Market</SelectItem>
                <SelectItem value="Limit">Limit</SelectItem>
                <SelectItem value="Conditional">Conditional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            onClick={handleSubmit}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Place Order
          </Button>
          <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700" onClick={onDismiss}>
            Skip
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}