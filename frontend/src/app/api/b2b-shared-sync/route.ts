import { NextResponse } from 'next/server';

// Global shared synchronization store in Node.js server process
// Allows instant synchronization between Buyer, Farmer, and Admin even across different browser profiles/tabs
const getGlobalStore = () => {
  if (!(globalThis as any).__hona_b2b_shared_sync__) {
    (globalThis as any).__hona_b2b_shared_sync__ = {
      rfqs: [],
      contracts: [],
    };
  }
  return (globalThis as any).__hona_b2b_shared_sync__;
};

export async function GET() {
  const store = getGlobalStore();
  return NextResponse.json({
    success: true,
    rfqs: store.rfqs,
    contracts: store.contracts,
  });
}

export async function POST(req: Request) {
  try {
    const store = getGlobalStore();
    const body = await req.json();
    const action = body.action;

    if (action === 'REGISTER_CONTRACT' && body.contract) {
      const c = body.contract;
      const idx = store.contracts.findIndex(
        (item: any) =>
          item.id === c.id ||
          (item.contractCode && c.contractCode && item.contractCode.trim().toUpperCase() === c.contractCode.trim().toUpperCase())
      );
      if (idx >= 0) {
        store.contracts[idx] = { ...store.contracts[idx], ...c };
      } else {
        store.contracts.unshift(c);
      }
    } else if (action === 'UPDATE_RFQ_STATUS') {
      const { id, rfqCode, status, counterPrice, counterQuantity } = body;
      const codeUpper = (rfqCode || '').trim().toUpperCase();
      const idx = store.rfqs.findIndex(
        (item: any) =>
          (id && item.id === id) ||
          (codeUpper && item.rfqCode && item.rfqCode.trim().toUpperCase() === codeUpper)
      );
      if (idx >= 0) {
        store.rfqs[idx].status = status;
        if (counterPrice !== undefined) store.rfqs[idx].counterPrice = counterPrice;
        if (counterQuantity !== undefined) store.rfqs[idx].counterQuantity = counterQuantity;
      } else if (codeUpper || id) {
        store.rfqs.unshift({
          id,
          rfqCode: codeUpper || `RFQ-${id}`,
          status,
          counterPrice,
          counterQuantity,
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (action === 'REGISTER_RFQ' && body.rfq) {
      const r = body.rfq;
      const codeUpper = (r.rfqCode || '').trim().toUpperCase();
      const idx = store.rfqs.findIndex(
        (item: any) =>
          item.id === r.id ||
          (codeUpper && item.rfqCode && item.rfqCode.trim().toUpperCase() === codeUpper)
      );
      if (idx >= 0) {
        store.rfqs[idx] = { ...store.rfqs[idx], ...r };
      } else {
        store.rfqs.unshift(r);
      }
    }

    return NextResponse.json({
      success: true,
      rfqs: store.rfqs,
      contracts: store.contracts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Lỗi server sync' }, { status: 400 });
  }
}
