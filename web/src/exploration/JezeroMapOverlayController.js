/**
 * JezeroMapOverlayController.js
 * Modul integrasi lapisan zona eksplorasi, marker objek, target misi, dan inspektor informasi
 * ke atas sistem peta dan transformasi koordinat project utama yang sudah ada.
 */

import {
  EXPLORATION_ZONES,
  EXPLORATION_OBJECTS,
  EXPLORATION_SEQUENCE_ROUTE
} from './jezeroExplorationData.js';

export class JezeroMapOverlayController {
  /**
   * @param {Object} options
   * @param {Function} options.latLonToScreen - Fungsi proyeksi koordinat milik project utama: (lat, lon) => { x, y }
   * @param {HTMLElement} options.overlayContainer - Elemen container UI/SVG yang menempel di atas viewport peta project
   * @param {Function} [options.onSelectFeature] - Callback opsional ke UI/HUD project ketika zona/marker dipilih
   * @param {Function} [options.onSetMissionWaypoint] - Callback read-only jika pemain menekan tombol "Tandai Tujuan Peta"
   */
  constructor({ latLonToScreen, overlayContainer, onSelectFeature, onSetMissionWaypoint }) {
    if (typeof latLonToScreen !== 'function') {
      throw new Error('[JezeroMapOverlayController] latLonToScreen dari project utama wajib disediakan.');
    }
    this.latLonToScreen = latLonToScreen;
    this.container = overlayContainer;
    this.onSelectFeature = onSelectFeature || (() => {});
    this.onSetMissionWaypoint = onSetMissionWaypoint || (() => {});

    this.state = {
      activeZoneId: 'JZ-03', // Zona awal sesuai urutan eksplorasi 1
      selectedFeature: null,
      showZones: true,
      showObjects: true,
      showExplorationPath: true,
      completedMissionIds: new Set()
    };

    this._initOverlayDOM();
    this.render();
  }

  _initOverlayDOM() {
    this.container.innerHTML = `
      <svg id="jezero-mission-svg-layer" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;">
        <g id="jz-zones-group" style="pointer-events:auto;"></g>
        <g id="jz-route-group" style="pointer-events:none;"></g>
        <g id="jz-markers-group" style="pointer-events:auto;"></g>
      </svg>
      <div id="jz-info-card" style="display:none;position:absolute;right:16px;bottom:16px;width:320px;max-width:90vw;background:rgba(13,18,28,0.94);border:1px solid #293548;border-radius:10px;padding:14px;color:#e2e8f0;font-family:system-ui,sans-serif;font-size:12px;z-index:30;box-shadow:0 10px 25px rgba(0,0,0,0.5);"></div>
    `;

    this.zonesGroup = this.container.querySelector('#jz-zones-group');
    this.routeGroup = this.container.querySelector('#jz-route-group');
    this.markersGroup = this.container.querySelector('#jz-markers-group');
    this.infoCard = this.container.querySelector('#jz-info-card');
  }

  /**
   * Panggil fungsi render() ini setiap kali kamera peta project melakukan pan / zoom / resize
   */
  render() {
    this._renderZones();
    this._renderExplorationSequence();
    this._renderObjectMarkers();
  }

  _renderZones() {
    this.zonesGroup.innerHTML = '';
    if (!this.state.showZones) return;

    EXPLORATION_ZONES.forEach((zone) => {
      const points = zone.boundaryLatLon
        .map(([lat, lon]) => {
          const pt = this.latLonToScreen(lat, lon);
          return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
        })
        .join(' ');

      const isSelected =
        this.state.selectedFeature?.type === 'zone' &&
        this.state.selectedFeature.data.id === zone.id;
      const isActiveZone = this.state.activeZoneId === zone.id;

      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', points);
      poly.setAttribute('fill', zone.color);
      poly.setAttribute('fill-opacity', isSelected ? '0.24' : isActiveZone ? '0.14' : '0.06');
      poly.setAttribute('stroke', zone.color);
      poly.setAttribute('stroke-width', isSelected || isActiveZone ? '2.4' : '1.5');
      poly.setAttribute('stroke-dasharray', isActiveZone ? 'none' : '6 4');
      poly.style.cursor = 'pointer';

      poly.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectZone(zone.id);
      });

      this.zonesGroup.appendChild(poly);

      // Label Identitas Zona di titik tengah zona
      const centerPt = this.latLonToScreen(zone.center.lat, zone.center.lon);
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', centerPt.x.toFixed(1));
      label.setAttribute('y', centerPt.y.toFixed(1));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', zone.color);
      label.setAttribute('font-size', '11');
      label.setAttribute('font-weight', '700');
      label.setAttribute('stroke', '#090c12');
      label.setAttribute('stroke-width', '3');
      label.setAttribute('paint-order', 'stroke');
      label.style.pointerEvents = 'none';
      label.textContent = `${zone.id} • ${zone.name}`;
      this.zonesGroup.appendChild(label);
    });
  }

  _renderExplorationSequence() {
    this.routeGroup.innerHTML = '';
    if (!this.state.showExplorationPath) return;

    const coords = EXPLORATION_SEQUENCE_ROUTE.map((zoneId) => {
      const z = EXPLORATION_ZONES.find((item) => item.id === zoneId);
      const pt = this.latLonToScreen(z.center.lat, z.center.lon);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', coords);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#38bdf8');
    line.setAttribute('stroke-width', '1.8');
    line.setAttribute('stroke-dasharray', '5 5');
    line.setAttribute('stroke-opacity', '0.75');
    this.routeGroup.appendChild(line);
  }

  _renderObjectMarkers() {
    this.markersGroup.innerHTML = '';
    if (!this.state.showObjects) return;

    // Anti-overlap sederhana berbasis jarak layar minimum (18 px)
    const placedScreenCoords = [];

    EXPLORATION_OBJECTS.forEach((obj) => {
      const pt = this.latLonToScreen(obj.lat, obj.lon);
      let drawX = pt.x;
      let drawY = pt.y;

      for (const prev of placedScreenCoords) {
        const dist = Math.hypot(drawX - prev.x, drawY - prev.y);
        if (dist < 18) {
          drawX += 14;
          drawY -= 12;
        }
      }
      placedScreenCoords.push({ x: drawX, y: drawY });

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${drawX.toFixed(1)}, ${drawY.toFixed(1)})`);
      g.style.cursor = 'pointer';

      const isTarget = obj.isMissionTarget;
      const fill =
        obj.category === 'MISSION_TARGET'
          ? '#f43f5e'
          : obj.category === 'MINERAL_INDICATOR'
          ? '#10b981'
          : '#38bdf8';

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', isTarget ? '6.5' : '5');
      circle.setAttribute('fill', fill);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '1.5');
      g.appendChild(circle);

      if (isTarget) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('r', '10.5');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', fill);
        ring.setAttribute('stroke-width', '1.2');
        ring.setAttribute('stroke-dasharray', '3 2');
        g.appendChild(ring);
      }

      g.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectObject(obj.id);
      });

      this.markersGroup.appendChild(g);
    });
  }

  selectZone(zoneId) {
    const zone = EXPLORATION_ZONES.find((z) => z.id === zoneId);
    if (!zone) return;
    this.state.selectedFeature = { type: 'zone', data: zone };
    this.render();
    this._renderZoneInfoCard(zone);
    this.onSelectFeature({ type: 'zone', data: zone });
  }

  selectObject(objectId) {
    const obj = EXPLORATION_OBJECTS.find((o) => o.id === objectId);
    if (!obj) return;
    const parentZone = EXPLORATION_ZONES.find((z) => z.id === obj.zoneId);
    this.state.selectedFeature = { type: 'object', data: obj };
    this.render();
    this._renderObjectInfoCard(obj, parentZone);
    this.onSelectFeature({ type: 'object', data: obj, zone: parentZone });
  }

  _renderZoneInfoCard(zone) {
    this.infoCard.style.display = 'block';
    this.infoCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-weight:700;color:${zone.color};">${zone.id} • Tahap ${zone.sequenceOrder}</span>
        <button id="jz-close-card" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;">✕</button>
      </div>
      <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:2px;">${zone.name}</div>
      <div style="color:#7dd3fc;font-size:11px;margin-bottom:8px;">${zone.subtitle}</div>
      <p style="margin:0 0 8px;color:#cbd5e1;line-height:1.4;">${zone.terrainCondition}</p>
      <div style="margin-bottom:8px;">
        <strong style="color:#94a3b8;font-size:10px;text-transform:uppercase;">Mineral Potensial:</strong>
        <div style="color:#6ee7b7;margin-top:2px;">${zone.minerals.join(', ')}</div>
      </div>
      <div style="background:rgba(30,41,59,0.7);border:1px solid #334155;border-radius:6px;padding:8px;margin-bottom:8px;">
        <div style="font-weight:700;color:#fbbf24;margin-bottom:3px;">Misi (${zone.mission.id}): ${zone.mission.title}</div>
        <div style="color:#e2e8f0;line-height:1.35;">${zone.mission.objective}</div>
      </div>
      <button id="jz-set-zone-target" style="width:100%;padding:6px 10px;border-radius:6px;border:1px solid #38bdf8;background:rgba(56,189,248,0.18);color:#7dd3fc;font-weight:600;cursor:pointer;">
        Tandai Zona di Peta Navigasi
      </button>
    `;

    this.infoCard.querySelector('#jz-close-card').onclick = () => {
      this.infoCard.style.display = 'none';
    };
    this.infoCard.querySelector('#jz-set-zone-target').onclick = () => {
      this.state.activeZoneId = zone.id;
      this.render();
      this.onSetMissionWaypoint({
        source: 'MAP_ZONE',
        id: zone.id,
        name: zone.name,
        lat: zone.center.lat,
        lon: zone.center.lon
      });
    };
  }

  _renderObjectInfoCard(obj, zone) {
    this.infoCard.style.display = 'block';
    this.infoCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#1e293b;color:#38bdf8;">${obj.evidenceStatus}</span>
        <button id="jz-close-card" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;">✕</button>
      </div>
      <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:2px;">${obj.name}</div>
      <div style="color:#94a3b8;font-size:11px;margin-bottom:8px;">
        ${obj.lat.toFixed(4)}°N, ${obj.lon.toFixed(4)}°E • Zona ${zone ? zone.id : obj.zoneId}
      </div>
      <p style="margin:0 0 6px;color:#e2e8f0;line-height:1.4;">${obj.shortDesc}</p>
      <p style="margin:0 0 10px;color:#94a3b8;font-size:11px;line-height:1.4;"><strong>Konteks Ilmiah:</strong> ${obj.scienceDetail}</p>
      <button id="jz-set-obj-target" style="width:100%;padding:6px 10px;border-radius:6px;border:1px solid #f43f5e;background:rgba(244,63,94,0.2);color:#fda4af;font-weight:600;cursor:pointer;">
        Pilih Titik Target Peta
      </button>
    `;

    this.infoCard.querySelector('#jz-close-card').onclick = () => {
      this.infoCard.style.display = 'none';
    };
    this.infoCard.querySelector('#jz-set-obj-target').onclick = () => {
      this.onSetMissionWaypoint({
        source: 'MAP_OBJECT',
        id: obj.id,
        name: obj.name,
        lat: obj.lat,
        lon: obj.lon
      });
    };
  }
}