import React, { useRef, useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { findKey, parseNumber } from '../utils/dataUtils';
import PsiEmailExportView from './PsiEmailExportView';

/**
 * Fetch an image URL and return it as a base64 data URI.
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
 * Compute top defect stats with prefetched data URIs for a slice of data
 */
const computeDefectImagesForFactory = async (fData, rawData) => {
  if (!fData || fData.length === 0) return [];
  const firstItem = rawData[0] || {};
  const nameKeys = [];
  const qtyKeys = [];
  const imageUrlKeyGroups = [];

  for (let i = 1; i <= 25; i++) {
    nameKeys[i] = findKey(firstItem, `defect_name_${i}`, `defect name ${i}`, `defectname${i}`);
    qtyKeys[i] = findKey(firstItem, `qty_defect_${i}`, `qty defect ${i}`, `qtydefect${i}`);

    const imageSlotStart = ((i - 1) * 3) + 1;
    imageUrlKeyGroups[i] = [0, 1, 2]
      .map((offset) => findKey(firstItem, `link${imageSlotStart + offset}`, `photo${imageSlotStart + offset}`))
      .filter(Boolean);
  }

  const counts = {};
  const imageSelections = {};

  fData.forEach((item, rowIndex) => {
    for (let i = 1; i <= 25; i++) {
      const nameKey = nameKeys[i];
      const qtyKey = qtyKeys[i];
      const imageUrlKeys = imageUrlKeyGroups[i] || [];

      if (!nameKey || !qtyKey) continue;
      const name = item[nameKey];
      const qty = parseNumber(item[qtyKey]);
      const url = imageUrlKeys.map((key) => item[key]).find((value) => value && value !== '-');

      if (name && name !== '-' && name !== 'NO DATA' && qty > 0) {
        const norm = name.trim();
        counts[norm] = (counts[norm] || 0) + qty;
        if (url && url !== '-') {
          const currentSelection = imageSelections[norm];
          if (
            !currentSelection ||
            qty > currentSelection.qty ||
            (qty === currentSelection.qty && rowIndex > currentSelection.rowIndex)
          ) {
            imageSelections[norm] = { url, qty, rowIndex };
          }
        }
      }
    }
  });

  const top5 = Object.entries(counts)
    .map(([name, value]) => ({ name, value, url: imageSelections[name]?.url || null }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

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

const PsiEmailExportController = ({ psiData, rawData, filters, onProgress, onDone }) => {
  const containerRef = useRef(null);
  const [prefetchedImagesMap, setPrefetchedImagesMap] = useState({});
  const [isReadyToCapture, setIsReadyToCapture] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (!psiData || psiData.length === 0) {
      alert('Tidak ada data PSI LV.2 untuk diexport.');
      onDone();
      return;
    }

    const runExport = async () => {
      try {
        const firstItem = rawData[0] || {};
        const factoryKey = findKey(firstItem, 'factory', 'building') || 'factory';

        // 1. Get unique factories
        const factorySet = new Set();
        psiData.forEach((item) => {
          const f = String(item[factoryKey] || '').trim();
          if (f && f !== '-') factorySet.add(f);
        });
        const factories = Array.from(factorySet).sort();

        // 2. Fetch images for each factory in parallel
        onProgress('Mengambil gambar defect untuk PDF...', 1, factories.length + 2);
        const imagesMap = {};

        for (let i = 0; i < factories.length; i++) {
          const f = factories[i];
          onProgress(`Mengambil gambar Factory ${f} (${i + 1}/${factories.length})...`, i + 1, factories.length + 2);
          const fData = psiData.filter((item) => String(item[factoryKey] || '').trim() === f);
          const images = await computeDefectImagesForFactory(fData, rawData);
          imagesMap[f] = images;
        }

        setPrefetchedImagesMap(imagesMap);
        setIsReadyToCapture(true);

        // Wait for React to render the view into the DOM
        onProgress('Merender tampilan slide BY BUILDING...', factories.length + 1, factories.length + 2);
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Wait for any remaining image elements to fully decode
        if (containerRef.current) {
          await waitForImages(containerRef.current);
        }

        // Wait an extra tick for Recharts SVG rendering
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 3. Capture DOM using toJpeg
        const container = containerRef.current?.querySelector('#psi-email-export-container') || containerRef.current;
        if (!container) {
          throw new Error('Container render tidak ditemukan.');
        }

        const width = container.scrollWidth || (520 + 460 + factories.length * 750 + 60);
        const height = container.scrollHeight || 750;

        onProgress('Menyimpan file PDF...', factories.length + 2, factories.length + 2);

        const dataUrl = await toJpeg(container, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          quality: 0.95,
          width,
          height
        });

        // 4. Create jsPDF in matching panoramic size
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [width, height]
        });

        pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);

        const dateSuffix = filters && filters.startDate && filters.startDate !== 'ALL'
          ? filters.startDate.replace(/[^0-9a-zA-Z]/g, '_')
          : 'Report';
        pdf.save(`PSI_Email_Report_${dateSuffix}.pdf`);

        onDone();
      } catch (err) {
        console.error('Error during PSI LV.2 Email PDF export:', err);
        alert('Gagal mengekspor PDF: ' + err.message);
        onDone();
      }
    };

    runExport();
  }, [psiData, rawData, filters, onProgress, onDone]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        zIndex: -999,
        opacity: 0,
        pointerEvents: 'none'
      }}
    >
      <PsiEmailExportView
        psiData={psiData}
        rawData={rawData}
        filters={filters}
        prefetchedImagesMap={prefetchedImagesMap}
      />
    </div>
  );
};

export default PsiEmailExportController;
