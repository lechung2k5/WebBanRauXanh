'use client';

import React from 'react';
import { Module2HarvestLots } from '@/components/admin/Module2HarvestLots';

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <Module2HarvestLots activeTab="categories" />
    </div>
  );
}
