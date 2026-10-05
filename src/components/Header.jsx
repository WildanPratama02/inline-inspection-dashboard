import React from 'react';

const Header = ({ data }) => {
  const { model, date, factory, cell, po, inspectorType } = data || {};

  const isFactoryHeader = inspectorType === 'PSI LV.2' || inspectorType === '3rd Party';

  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h1 className="text-xl font-bold mb-3">
          {inspectorType === 'PSI LV.2' ? 'PSI LV.2' : inspectorType === '3rd Party' ? 'AQL 3rd Party' : 'QUALITY INSPECTION PERFORMANCE'} ({model || 'N/A'})
        </h1>
        <div className="grid grid-cols-[120px_1fr] gap-x-2 text-base">
          <span className="text-gray-400">{inspectorType === 'CFA' ? 'Inspection Date' : 'Date'}</span>
          <span>: {date || 'N/A'}</span>
          <span className="text-gray-400">Factory</span>
          <span>: {factory || 'N/A'}</span>
          <span className="text-gray-400">Cell</span>
          <span>: {cell || 'N/A'}</span>
          <span className="text-gray-400">PO#</span>
          <span>: {po || 'N/A'}</span>
          <span className="text-gray-400">Insp. Type</span>
          <span>: {inspectorType || 'ALL'}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-4">
        <div className="bg-[#BDE0FE] text-black px-6 py-1 font-bold text-lg uppercase min-w-[250px] text-center">
          {isFactoryHeader ? (data.factory || 'FACTORY') : (data.inspector || 'INSPECTOR NAME')}
        </div>
      </div>
    </div>
  );
};

export default Header;
