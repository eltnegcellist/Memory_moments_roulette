/* Photo wheel with fixed photo slots. The player owns the draw and result. */
const photoWheel = (() => {
  const surface = document.getElementById('photoWheel');
  const button = document.getElementById('photoWheelAction');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowPortrait = matchMedia('(max-width: 600px) and (orientation: portrait)');
  const stepsPerSecond = 6;
  const overviewHold = 500;
  const overviewSpin = 900;
  const zoomDuration = 1700;
  const brakingZoomDuration = 420;
  const overviewPadding = 12;
  const minimumBrakeSteps = 3;
  const resultDelay = 350;
  const svgNS = 'http://www.w3.org/2000/svg';
  const wrapAngle = value => ((value % 360) + 360) % 360;

  surface.innerHTML = '<svg viewBox="0 0 500 500" aria-hidden="true">' +
    '<g class="photoWheelDisc">' +
      '<defs class="photoWheelDefs"></defs>' +
      '<circle cx="250" cy="250" r="249" fill="#e5b7ab"/>' +
      '<circle cx="250" cy="250" r="244" fill="#fff3de" stroke="#fff9ee" stroke-width="3"/>' +
      '<circle cx="250" cy="250" r="232" fill="#f3d8c6"/>' +
      '<g class="photoWheelSectors"></g>' +
      '<circle class="photoWheelSteppedRim" cx="250" fill="none" stroke="#bd8c81" stroke-width="4"/>' +
    '</g>' +
    '<circle cx="250" cy="250" r="39" fill="#fffaf2" stroke="#e1b2aa" stroke-width="5"/>' +
    '<circle cx="250" cy="250" r="7" fill="#a52852"/>' +
    '<path class="photoWheelPointer" d="M226 0h48a7 7 0 0 1 6 11l-24 38a7 7 0 0 1-12 0l-24-38a7 7 0 0 1 6-11Z" fill="#a52852" stroke="#fff8ee" stroke-width="4"/></svg>';

  const defs = surface.querySelector('.photoWheelDefs');
  const disc = surface.querySelector('.photoWheelDisc');
  const sectors = surface.querySelector('.photoWheelSectors');
  const steppedRim = surface.querySelector('.photoWheelSteppedRim');
  const wheelSvg = surface.querySelector('svg');
  const pointer = surface.querySelector('.photoWheelPointer');
  const backdropCircles = [...disc.children].filter(node =>
    node !== steppedRim && node.tagName.toLowerCase() === 'circle');
  const hubCircles = [...wheelSvg.children].filter(node => node.tagName.toLowerCase() === 'circle');
  let slots = [];
  let lastPointedSlot = -1;
  let spinStartedAt = 0;
  let rimCircumference;
  let farCameraWidth;
  let zoomProgress;
  let previousNearWidth;
  let angle = 0;
  let brake = null;
  let selecting = false;
  let animationFrame;
  let landingTimer;
  let pressedControl;

  function svgElement(tag, attributes) {
    const node = document.createElementNS(svgNS, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  }

  function render(frames) {
    slots = Array.from(frames.keys()).filter(index => frames[index]);
    lastPointedSlot = -1;
    angle = 0;
    // World geometry is independent of the camera. The full circular wheel
    // exists at once, including photos that lie outside the close-up viewport.
    const count = slots.length;
    const outer = Math.max(229, count * 215 / (2 * Math.PI));
    const centerY = 20 + outer;
    const cx = 250;
    const ringDepth = Math.min(360, outer - 12);
    const inner = outer - ringDepth;
    const angularStep = 2 * Math.PI / count;
    const quarterTurn = Math.PI / 2;
    const sourceSize = 512;
    const point = (radius, radians) => ({
      x: cx + radius * Math.sin(radians),
      y: centerY - radius * Math.cos(radians)
    });
    const xy = p => p.x.toFixed(3) + ' ' + p.y.toFixed(3);
    const sectorPath = (a, b, c, d) => {
      if (count === 1) {
        const top = centerY - outer;
        return 'M' + cx + ' ' + top + ' a' + outer + ' ' + outer
          + ' 0 1 1 0 ' + (2 * outer) + ' a' + outer + ' ' + outer
          + ' 0 1 1 0 ' + (-2 * outer) + 'Z';
      }
      return 'M' + xy(a) + ' A' + outer + ' ' + outer + ' 0 0 1 ' + xy(b)
        + ' L' + xy(c) + ' A' + inner + ' ' + inner + ' 0 0 0 ' + xy(d) + 'Z';
    };
    const farRadius = centerY + overviewPadding;
    farCameraWidth = 2 * farRadius;
    wheelSvg.dataset.cameraFar = cameraBox(farCameraWidth, centerY - farRadius);
    zoomProgress = previousNearWidth = undefined;
    setCamera(motion.matches ? 1 : 0);
    wheelSvg.dataset.totalFrames = String(count);
    backdropCircles.forEach((circle, i) => {
      circle.setAttribute('cy', String(centerY));
      circle.setAttribute('r', String(outer + [20, 14, 2][i]));
    });
    hubCircles.forEach(circle => circle.setAttribute('cy', String(centerY)));
    const rimRadius = outer + 9;
    rimCircumference = 2 * Math.PI * rimRadius;
    const markSpacing = rimCircumference / Math.max(24, count);
    const markLength = Math.min(11, markSpacing / 3);
    steppedRim.setAttribute('cy', String(centerY));
    steppedRim.setAttribute('r', String(rimRadius));
    steppedRim.setAttribute('stroke-dasharray', markLength + ' ' + (markSpacing - markLength));
    steppedRim.setAttribute('stroke-dashoffset', '0');

    const sources = slots.map((index, slot) => svgElement('image', {
      id:'photoWheelSource' + slot, href:frames[index], width:sourceSize, height:sourceSize,
      preserveAspectRatio:'xMidYMid slice'
    }));
    const masks = [];
    const groups = slots.map((index, slot) => {
      const center = slot * angularStep;
      const left = center - angularStep / 2;
      const right = center + angularStep / 2;
      const a = point(outer, left), b = point(outer, right);
      const c = point(inner, right), d = point(inner, left);
      const path = sectorPath(a, b, c, d);
      // The ends and any cardinal points on the outer arc bound the whole sector.
      const extrema = [a, b, c, d];
      for (let axis = Math.ceil(left / quarterTurn); axis * quarterTurn <= right; axis++) {
        extrema.push(point(outer, axis * quarterTurn));
      }
      const xs = extrema.map(p => p.x);
      const ys = extrema.map(p => p.y);
      const x = Math.min(...xs), y = Math.min(...ys);
      const width = Math.max(...xs) - x, height = Math.max(...ys) - y;
      const size = Math.max(width, height) + 2;
      const photoX = x + (width - size) / 2;
      const photoY = y + (height - size) / 2;
      const maskId = 'photoWheelStepClip' + slot;
      const mask = svgElement('clipPath', {id:maskId});
      mask.append(svgElement('path', {d:path}));
      masks.push(mask);
      const photo = svgElement('use', {
        href:'#photoWheelSource' + slot,
        transform:'translate(' + photoX + ' ' + photoY + ') scale(' + size / sourceSize + ')'
      });
      const cropped = svgElement('g', {'clip-path':'url(#' + maskId + ')'});
      cropped.append(photo);
      const shape = svgElement('path', {d:path, fill:'none', stroke:'#fff3dd', 'stroke-width':3});
      const selection = svgElement('path', {
        class:'photoWheelSelection', d:path, fill:'none', stroke:'#a52852', 'stroke-width':5
      });
      const group = svgElement('g', {'data-wheel-slot':slot, 'data-frame-index':index});
      group.append(cropped, shape, selection);
      return group;
    });
    defs.replaceChildren(...sources, ...masks);
    sectors.replaceChildren(...groups);
  }

  function cameraBox(width, top) {
    return [250 - width / 2, top, width, width].join(' ');
  }

  function setCamera(progress) {
    const nearWidth = Math.min(narrowPortrait.matches ? 345 : 500, farCameraWidth * .73);
    if (zoomProgress === progress && previousNearWidth === nearWidth) return;
    if (previousNearWidth !== nearWidth) {
      previousNearWidth = nearWidth;
      wheelSvg.dataset.cameraNear = cameraBox(nearWidth, 0);
    }
    zoomProgress = progress;
    // Interpolate magnification while keeping the upper rim in view.
    const width = farCameraWidth * (nearWidth / farCameraWidth) ** progress;
    const top = -overviewPadding * (width - nearWidth) / (farCameraWidth - nearWidth);
    const box = progress === 0 ? wheelSvg.dataset.cameraFar
      : progress === 1 ? wheelSvg.dataset.cameraNear : cameraBox(width, top);
    wheelSvg.setAttribute('viewBox', box);
    pointer.setAttribute('transform', 'translate(' + (250 - width / 2) + ' ' + top
      + ') scale(' + width / 500 + ')');
  }

  function cameraEase(progress) {
    return progress * progress * (3 - 2 * progress);
  }

  function runningSpeed() {
    return 360 * stepsPerSecond / slots.length;
  }

  function swapPhotos(pointedSlot) {
    [...sectors.children].forEach((group, position) => {
      const source = (position + pointedSlot) % slots.length;
      group.querySelector('use').setAttribute('href', '#photoWheelSource' + source);
      group.setAttribute('data-frame-index', slots[source]);
    });
  }

  function draw(value) {
    const nextAngle = slots.length === 1 ? 0 : wrapAngle(value);
    if (angle !== nextAngle) {
      angle = nextAngle;
      steppedRim.setAttribute('stroke-dashoffset', String(-angle * rimCircumference / 360));
    }
    const slot = Math.round(wrapAngle(-angle) / (360 / slots.length)) % slots.length;
    if (slot === lastPointedSlot) return;
    lastPointedSlot = slot;
    swapPhotos(slot);
    window.__memoryShareOnFrame?.(slots[slot]);
  }

  function land() {
    setCamera(1);
    draw(brake.target);
    sectors.children[0].setAttribute('data-selected', '');
    const done = brake.done;
    brake = null;
    if (motion.matches) done();
    else landingTimer = setTimeout(done, resultDelay);
  }

  function animate(now) {
    if (brake) {
      const elapsed = Math.max(0, now - brake.startedAt);
      const progress = Math.min(1, elapsed / brake.duration);
      if (progress === 1 || motion.matches) {
        land();
        return;
      }
      draw(brake.from + brake.travel * progress * (2 - progress));
      const zoom = cameraEase(Math.min(1, elapsed / brakingZoomDuration));
      setCamera(brake.zoomFrom + (1 - brake.zoomFrom) * zoom);
    } else if (motion.matches) {
      setCamera(1);
    } else {
      const elapsed = Math.max(0, now - spinStartedAt - overviewHold);
      draw(elapsed * runningSpeed() / 1000);
      const zoom = Math.min(1, Math.max(0, (elapsed - overviewSpin) / zoomDuration));
      setCamera(cameraEase(zoom));
    }
    animationFrame = requestAnimationFrame(animate);
  }

  function resetMotion() {
    cancelAnimationFrame(animationFrame);
    clearTimeout(landingTimer);
    brake = null;
  }

  for (const control of [surface, button]) {
    control.addEventListener('pointerdown', () => { pressedControl = control; });
    control.addEventListener('pointercancel', () => { pressedControl = null; });
    control.addEventListener('click', event => {
      const startedHere = pressedControl === control;
      pressedControl = null;
      if ((event.pointerType || event.detail > 0) && !startedHere) return;
      if (!primed) unlockAudio();
      else ensureAudio();
      if (running) stopRun();
      else startRun();
    });
    control.addEventListener('keydown', event => {
      if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
    });
  }

  function controls(label, disabled = false) {
    button.textContent = label;
    surface.setAttribute('aria-label', label);
    button.disabled = surface.disabled = disabled;
  }

  function showControls(label, disabled) {
    stage.classList.add('photoWheelActive');
    surface.hidden = button.hidden = false;
    controls(label, disabled);
  }

  return {
    waiting(frames) {
      resetMotion();
      selecting = false;
      render(frames);
      showControls('準備中…', true);
    },
    start(frames) {
      resetMotion();
      render(frames);
      selecting = true;
      showControls('ストップ');
      spinStartedAt = performance.now();
      draw(0);
      animationFrame = requestAnimationFrame(animate);
    },
    selection(eligible = null) {
      if (!selecting) return false;
      if (!eligible || slots.length <= 3) return new Set(slots);
      // Prefer nearby undrawn photos so a wheel with 100 frames does not
      // typically take an entire revolution to brake after a tap.
      const allowed = new Set(eligible);
      const step = 360 / slots.length;
      const current = Math.round(wrapAngle(-angle) / step) % slots.length;
      const upcoming = slots.map((index, position) => ({
        index, distance:(current - position + slots.length) % slots.length || slots.length
      })).filter(item => allowed.has(item.index))
        .sort((a, b) => a.distance - b.distance);
      const nearby = upcoming.filter(item => item.distance >= minimumBrakeSteps + 1).slice(0, 8);
      if (nearby.length) return new Set(nearby.map(item => item.index));
      return new Set(upcoming.slice(0, 1).map(item => item.index));
    },
    hold() {
      selecting = false;
      controls('減速中…', true);
    },
    stop(index, done) {
      const target = -slots.indexOf(index) * (360 / slots.length);
      const travel = wrapAngle(target - angle);
      // The next undrawn frame is normally at least four steps ahead.
      // Do not force a full 100-frame revolution for the last remaining
      // candidates when a target is closer than the preferred braking arc.
      const duration = Math.max(700, 2000 * travel / runningSpeed());
      brake = {from:angle, target, travel, duration, startedAt:performance.now(), zoomFrom:zoomProgress, done};
      if (motion.matches) {
        cancelAnimationFrame(animationFrame);
        land();
      }
    },
    hide() {
      resetMotion();
      selecting = false;
      pressedControl = null;
      stage.classList.remove('photoWheelActive');
      surface.hidden = button.hidden = true;
    }
  };
})();
