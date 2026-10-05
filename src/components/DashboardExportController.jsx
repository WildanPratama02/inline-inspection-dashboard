import React, { useRef, useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { findKey, parseNumber, getInspectorType } from '../utils/dataUtils';
import DashboardContentView from './DashboardContentView';

/**
 * Fetch an image URL and return it as a base64 data URI.
 * Uses cache-busting to ensure we get the actual image for each unique URL.
 */
const fetchImageAsDataUri = async (proxyUrl) => {
  try {
    const res = await fetch(proxyUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * For a given set of filtered data rows, compute the top-5 defect stats 
 * and pre-fetch each defect's image as a data URI.
 * Returns: [{ name, value, dataUri }, ...]
 */
const computeDefectImagesForPage = async (pageData, rawData) => {
  if (!pageData || pageData.length === 0) return [];

  const firstItem = rawData[0] || {};
  const nameKeys = [];
  const qtyKeys = [];
  const imageUrlKeyGroups = [];

  for (let i = 1; i <= 25; i++) {
    nameKeys[i] = findKey(firstItem, `defect_name_${i}`, `defect name ${i}`, `defectname${i}`);
    qtyKeys[i] = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`, `qtydefect${i}`);

    const imageSlotStart = ((i - 1) * 3) + 1;
    imageUrlKeyGroups[i] = [0, 1, 2]
      .map((offset) => {
        const slot = imageSlotStart + offset;
        return findKey(firstItem, `link${slot}`, `photo${slot}`);
      })
      .filter(Boolean);
  }

  const counts = {};
  const imageSelections = {};

  pageData.forEach((item, rowIndex) => {
    for (let i = 1; i <= 25; i++) {
      const nameKey = nameKeys[i];
      const qtyKey = qtyKeys[i];
      const imageUrlKeys = imageUrlKeyGroups[i] || [];

      if (!nameKey || !qtyKey) continue;

      const name = item[nameKey];
      const qty = parseNumber(item[qtyKey]);
      const url = imageUrlKeys.map((key) => item[key]).find((value) => value && value !== '-');

      if (name && name !== '-' && name !== 'NO DATA' && qty > 0) {
        const normalizedName = name.trim();
        counts[normalizedName] = (counts[normalizedName] || 0) + qty;

        if (url && url !== '-') {
          const currentSelection = imageSelections[normalizedName];
          if (
            !currentSelection ||
            qty > currentSelection.qty ||
            (qty === currentSelection.qty && rowIndex > currentSelection.rowIndex)
          ) {
            imageSelections[normalizedName] = { url, qty, rowIndex };
          }
        }
      }
    }
  });

  const top5 = Object.entries(counts)
    .map(([name, value]) => ({ name, value, url: imageSelections[name]?.url || null }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Pre-fetch each image as a data URI
  const results = await Promise.all(
    top5.map(async (stat) => {
      let dataUri = null;
      if (stat.url) {
        const proxyUrl = stat.url.replace('https://www.appsheet.com', '/appsheet-img');
        dataUri = await fetchImageAsDataUri(proxyUrl);
      }
      return { name: stat.name, value: stat.value, dataUri };
    })
  );

  return results;
};

/**
 * Wait for all <img> elements inside a container to finish loading.
 */
const waitForImages = (container, timeoutMs = 6000) => {
  return new Promise((resolve) => {
    const images = container.querySelectorAll('img');
    if (images.length === 0) { resolve(); return; }
    let loaded = 0;
    const total = images.length;
    const done = () => { loaded++; if (loaded >= total) resolve(); };
    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) { done(); }
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
    setTimeout(resolve, timeoutMs);
  });
};

/**
 * Off-screen renderer that iterates over every (Cell, PO) combination
 * present in the filteredData, renders a DashboardContentView for it,
 * captures it as a JPEG, and appends it to a multi-page PDF.
 *
 * Images are PRE-FETCHED as data URIs before rendering to avoid
 * browser cache / lazy-loading / CORS issues during html-to-image capture.
 */
const DashboardExportController = ({ filteredData, rawData, filters, activeTab, onProgress, onDone }) => {
  const containerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(null);
  const [preloadedImages, setPreloadedImages] = useState([]);
  const hasStarted = useRef(false);

  const currentTab = activeTab || (filters && filters.activeTab) || (filters && filters.inspectorType && filters.inspectorType.includes('3rd Party') ? '3rd Party' : filters && filters.inspectorType && filters.inspectorType.includes('CFA') ? 'CFA' : 'PSI LV.2');
  const isGroupByFactory = ['PSI LV.1', 'PSI LV.2', '3rd Party'].includes(currentTab);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (!filteredData || filteredData.length === 0) {
      onDone();
      return;
    }

    const firstItem = rawData[0] || {};
    const cellKey = findKey(firstItem, 'cell');
    const poKey = findKey(firstItem, 'po');
    const factoryKey = findKey(firstItem, 'factory', 'building') || 'factory';

    let pages = [];

    if (isGroupByFactory) {
      // Group data by Factory for PSI and 3rd Party
      const combinationsMap = {};
      filteredData.forEach(item => {
        const factory = String(item[factoryKey] || 'Unknown').trim();
        if (!combinationsMap[factory]) {
          combinationsMap[factory] = { factory, data: [] };
        }
        combinationsMap[factory].data.push(item);
      });

      pages = Object.values(combinationsMap)
        .sort((a, b) => a.factory.localeCompare(b.factory));
    } else {
      // Group data by Cell+PO for other tabs (e.g. CFA, T1QM)
      const combinationsMap = {};
      filteredData.forEach(item => {
        const cell = String(item[cellKey] || 'Unknown').trim();
        const po = String(item[poKey] || 'Unknown').trim();
        const key = `${cell}___${po}`;
        if (!combinationsMap[key]) {
          combinationsMap[key] = { cell, po, data: [] };
        }
        combinationsMap[key].data.push(item);
      });

      pages = Object.values(combinationsMap)
        .sort((a, b) => {
          const cellCmp = a.cell.localeCompare(b.cell);
          if (cellCmp !== 0) return cellCmp;
          return a.po.localeCompare(b.po);
        });
    }

    // Run the sequential capture loop
    const runAll = async () => {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1400, 900]
      });
      let isFirstPage = true;

      for (let idx = 0; idx < pages.length; idx++) {
        const page = pages[idx];
        const pageLabel = isGroupByFactory ? `Factory ${page.factory}` : `${page.cell} - ${page.po}`;

        onProgress(
          `Fetching images for page ${idx + 1} of ${pages.length} (${pageLabel})...`,
          idx + 1,
          pages.length
        );

        // 1. Pre-fetch all images for this page as data URIs
        const images = await computeDefectImagesForPage(page.data, rawData);

        // 2. Detect inspectorType for this page's data
        const inspectorKey = findKey(rawData[0] || {}, 'inspector');
        const pageInspectorTypes = new Set();
        page.data.forEach(item => {
          const inspName = inspectorKey ? item[inspectorKey] : null;
          const iType = getInspectorType(inspName, item);
          if (iType) pageInspectorTypes.add(iType);
        });

        // 3. Update state to render DashboardContentView with pre-loaded images
        const pageFilters = isGroupByFactory
          ? {
            ...filters,
            factory: [page.factory],
            inspectorType: pageInspectorTypes.size > 0
              ? Array.from(pageInspectorTypes)
              : (filters.inspectorType && filters.inspectorType.length > 0 ? filters.inspectorType : [currentTab])
          }
          : {
            ...filters,
            cell: [page.cell],
            po: [page.po],
            inspectorType: pageInspectorTypes.size > 0
              ? Array.from(pageInspectorTypes)
              : (filters.inspectorType && filters.inspectorType.length > 0 ? filters.inspectorType : [])
          };

        // Use a promise to wait for React to render
        await new Promise((resolve) => {
          setPreloadedImages(images);
          setCurrentPage({ data: page.data, filters: pageFilters, key: Date.now() });
          // Give React time to render
          setTimeout(resolve, 800);
        });

        onProgress(
          `Capturing page ${idx + 1} of ${pages.length} (${pageLabel})...`,
          idx + 1,
          pages.length
        );

        // 3. Wait for any remaining images in DOM to load
        if (containerRef.current) {
          const pageEl = containerRef.current.querySelector('.dashboard-export-page');
          if (pageEl) {
            await waitForImages(pageEl);
            await new Promise(r => setTimeout(r, 200));

            try {
              const dataUrl = await toJpeg(pageEl, {
                quality: 0.8,
                backgroundColor: '#0A0520',
                pixelRatio: 1,
                skipFonts: true
              });

              if (!isFirstPage) {
                pdf.addPage([1400, 900], 'landscape');
              }
              isFirstPage = false;
              pdf.addImage(dataUrl, 'JPEG', 0, 0, 1400, 900);
            } catch (err) {
              console.error(`Failed to capture page ${idx + 1}`, err);
            }
          }
        }
      }

      // Save the PDF
      onProgress('Saving PDF...', pages.length, pages.length);
      await new Promise(r => setTimeout(r, 300));
      const filename = `Dashboard_${activeTab ? activeTab.replace(/\s+/g, '_') : 'MultiPage'}_Export.pdf`;
      pdf.save(filename);
      onDone();
    };

    runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentPage) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 1400,
        height: 900,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
        opacity: 0.01
      }}
      ref={containerRef}
    >
      <div className="dashboard-export-page" style={{ width: 1400, height: 900, background: '#0A0520' }}>
        <DashboardContentView
          key={currentPage.key}
          id="export-dashboard-canvas"
          data={currentPage.data}
          rawData={rawData}
          filters={currentPage.filters}
          preloadedImages={preloadedImages}
          activeTab={activeTab || currentTab}
        />
      </div>
    </div>
  );
};

export default DashboardExportController;

