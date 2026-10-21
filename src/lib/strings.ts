/**
 * Every user-facing string lives here so the app can be localized later
 * without hunting through components.
 */
import type { BrowserName } from '@/lib/capabilities';

export const APP_NAME = 'TraceLens';

export const strings = {
  app: {
    name: APP_NAME,
    tagline: 'Trace any sketch onto real paper',
    subtitle: 'Prop up your phone, pick a drawing, and follow the lines with your pencil.',
  },

  nav: {
    home: 'Home',
    trace: 'Trace',
    settings: 'Settings',
    onboarding: 'Get started',
    back: 'Back',
  },

  onboarding: {
    title: 'Trace on paper, not on glass',
    steps: [
      {
        title: 'Prop up your phone',
        body: 'Set your phone on a stand or against something sturdy, camera facing the paper. Keep both hands free for drawing.',
      },
      {
        title: 'Pick an image',
        body: 'Choose a photo, a sketch from the gallery, or drop your own file. TraceLens overlays it on the live camera view.',
      },
      {
        title: 'Trace the lines',
        body: 'Adjust the size and opacity, then follow the ghost lines with a real pencil or pen. The result stays on paper.',
      },
    ],
    startCamera: 'Start camera',
    continueWithout: 'Continue without camera',
    tryAgain: 'Try again',
    skip: 'Skip',
    next: 'Next',
    gotIt: 'Got it',
    permissionNote: 'Your camera stays on your device. Nothing is uploaded, ever.',
  },

  camera: {
    starting: 'Starting camera…',
    live: 'Camera live',
    off: 'Camera off',
    start: 'Start camera',
    startHint: 'Turn the camera on to see your paper behind the overlay.',
    stop: 'Stop camera',
    switchCamera: 'Switch camera',
    mirror: 'Mirror camera',
    noCameraOverlayTitle: 'Overlay-only mode',
    noCameraOverlayBody: 'Camera is unavailable, so you can still size and position the overlay on a plain background.',
    torch: 'Torch',
    torchOn: 'Turn torch on',
    torchOff: 'Turn torch off',
    zoom: 'Camera zoom',
    focusLock: 'Lock focus',
    focusLocked: 'Focus locked',
    focusUnlock: 'Unlock focus',
    focusNotSupportedHint:
      'Tip: tap the paper once to focus, then avoid moving your hand in front of the camera.',
    tapToFocus: 'Tap the paper to focus',
    focusing: 'Focusing…',
    deviceEnded: 'The camera stopped. Tap to restart.',
    resolution: 'Resolution',
  },

  home: {
    startTracing: 'Start tracing',
    continueSession: 'Continue last session',
    pickFromGallery: 'Pick from gallery',
    dropHint: 'Drag an image here',
    samplesTitle: 'Sample sketches',
    samplesBody: 'Tap one to start tracing right away.',
    recentsTitle: 'Recent images',
    recentsEmpty: 'Images you import will show up here for quick access.',
    openSettings: 'Settings',
    howItWorks: 'How it works',
    seeAll: 'See all',
    clearRecents: 'Clear',
    deleteImage: 'Delete image',
  },

  trace: {
    title: 'Trace',
    opacity: 'Opacity',
    mode: 'Mode',
    edgeThreshold: 'Edge threshold',
    tint: 'Line color',
    grid: 'Grid',
    gridOff: 'Off',
    gridColor: 'Grid color',
    gridThickness: 'Thickness',
    customDivisions: 'Custom',
    lock: 'Lock overlay',
    unlock: 'Unlock overlay',
    lockHint: 'Overlay is locked — controls still work',
    flipH: 'Flip horizontally',
    flipV: 'Flip vertically',
    reset: 'Reset position',
    hide: 'Hold to hide',
    hideHint: 'Press and hold to see your paper',
    holdToHide: 'Hold',
    immersiveOn: 'Immersive mode',
    immersiveOff: 'Exit immersive mode',
    exitImmersive: 'Exit immersive',
    changeImage: 'Change image',
    timer: 'Session timer',
    timerToggle: 'Show timer',
    brightness: 'Brightness boost',
    contrast: 'Contrast',
    moreControls: 'More controls',
    fewerControls: 'Hide controls',
    processing: 'Creating outline…',
    processingHint: 'Edge detection runs on your device',
    noImage: 'No image selected',
    noImageBody: 'Pick a sample or import an image to start tracing.',
    pickImage: 'Choose an image',
    lockedNotice: 'Overlay locked',
    shortcutHint: 'Shortcuts: L lock · G grid · H hold to hide · R reset · F flip · arrows nudge · +/− zoom',
  },

  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    tracing: 'Tracing defaults',
    defaultOpacity: 'Default opacity',
    defaultMode: 'Default image mode',
    defaultGrid: 'Default grid',
    keepScreenOn: 'Keep screen awake',
    keepScreenOnHint: 'Uses the Screen Wake Lock API where available.',
    haptics: 'Haptic feedback',
    hapticsHint: 'Short vibrations on lock, unlock and gestures.',
    showTimer: 'Show session timer',
    camera: 'Camera',
    cameraDevice: 'Preferred camera',
    cameraDefault: 'Automatic (rear camera)',
    cameraNote: 'Camera selection needs permission before device names are visible.',
    language: 'Language',
    languageNote: 'Only English ships today. Strings are centralized for future translations.',
    setupTitle: 'How to set up your phone stand',
    setupTips: [
      'Use a stable stand or lean the phone against something that will not shift.',
      'Light the paper evenly from both sides and avoid casting your own shadow.',
      'Tape or weight the paper down so it cannot slide while you trace.',
      'Keep the phone 25–40 cm above the paper and roughly parallel to it.',
      'Turn on the grid to check the overlay is not skewed.',
    ],
    data: 'Data & storage',
    storageUsed: 'Stored on this device',
    clearData: 'Clear all data',
    clearDataConfirmTitle: 'Delete everything?',
    clearDataConfirmBody:
      'This removes all imported images, recent images and saved settings from this device. It cannot be undone.',
    clearDataConfirm: 'Delete everything',
    cancel: 'Cancel',
    about: 'About',
    version: 'Version',
    privacy: 'Private by design — images never leave your device.',
    diagnostics: 'Device capabilities',
    supported: 'Supported',
    unsupported: 'Not supported',
    resetDefaults: 'Reset to defaults',
    resetDefaultsDone: 'Settings reset',
  },

  grid: {
    size: 'Grid size',
    divisions: '{{count}} × {{count}}',
    color: 'Line color',
    thickness: 'Line thickness',
  },

  modes: {
    original: 'Original',
    outline: 'Outline',
    grayscale: 'Grayscale',
    invert: 'Invert',
  },

  tints: {
    black: 'Black',
    white: 'White',
    red: 'Red',
    green: 'Green',
    cyan: 'Cyan',
    custom: 'Custom',
  },

  install: {
    title: 'Install TraceLens',
    body: 'Add TraceLens to your home screen and use it full screen, even offline.',
    button: 'Install app',
    installed: 'TraceLens is installed',
    iosTitle: 'Add to Home Screen',
    iosStep1: 'Tap the Share button in Safari.',
    iosStep2: 'Scroll down and tap “Add to Home Screen”.',
    iosStep3: 'Tap “Add”. TraceLens opens full screen from your home screen.',
    dismiss: 'Not now',
  },

  update: {
    title: 'Update available',
    body: 'A new version of TraceLens is ready.',
    action: 'Refresh',
    later: 'Later',
  },

  wakeLock: {
    unavailable: 'Screen Wake Lock is not supported here — your screen may dim while tracing.',
    failed: 'Could not keep the screen awake.',
    active: 'Screen stays awake while tracing.',
  },

  errors: {
    permissionDeniedTitle: 'Camera access is blocked',
    permissionDeniedBody:
      'TraceLens needs camera access to show your paper. You can still use overlay-only mode without it.',
    dismissedTitle: 'Camera request dismissed',
    dismissedBody: 'The permission prompt closed before you chose. Try again when you are ready.',
    notFoundTitle: 'No camera found',
    notFoundBody: 'We could not find a camera on this device.',
    insecureTitle: 'A secure connection is required',
    insecureBody:
      'Browsers only allow camera access over HTTPS or on localhost. Open the app over https:// and try again.',
    unsupportedTitle: 'This browser cannot use the camera',
    unsupportedBody: 'Your browser does not expose the MediaDevices camera API.',
    overconstrainedTitle: 'Camera settings unsupported',
    overconstrainedBody: 'The requested camera settings are not available. Trying a simpler setup.',
    failedTitle: 'Camera failed to start',
    failedBody: 'Something went wrong while starting the camera.',
    imageDecodeTitle: 'That image could not be loaded',
    imageDecodeBody: 'Try a different image — PNG, JPEG or WebP work best.',
    imageTooLargeTitle: 'That image is too large',
    imageTooLargeBody: 'Images are downscaled automatically, but this one could not be processed.',
    storageTitle: 'Saving failed',
    storageBody: 'Your browser storage may be full or in private mode. The app still works this session.',
    workerTitle: 'Image processing failed',
    workerBody: 'The outline could not be generated. Try a smaller image or a higher threshold.',
    unknownTitle: 'Something went wrong',
    unknownBody: 'Please try again.',
    helpTitle: 'How to re-enable the camera',
  },

  help: {
    chromeAndroid: [
      'Tap the lock or tune icon next to the address bar.',
      'Tap “Permissions”, then “Camera”.',
      'Choose “Allow”, then reload the page.',
    ],
    safariIos: [
      'Open Settings on your iPhone or iPad.',
      'Scroll to Safari, then tap “Camera”.',
      'Choose “Ask” or “Allow”, then reload the page.',
    ],
    desktop: [
      'Click the camera icon in the address bar.',
      'Choose “Always allow” for this site.',
      'Reload the page.',
    ],
  },

  common: {
    close: 'Close',
    done: 'Done',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    apply: 'Apply',
    retry: 'Retry',
    loading: 'Loading…',
    yes: 'Yes',
    no: 'No',
    custom: 'Custom',
    on: 'On',
    off: 'Off',
    search: 'Search',
    more: 'More options',
  },

  a11y: {
    overlayImage: 'Reference image overlay',
    cameraPreview: 'Live camera preview',
    gridOverlay: 'Alignment grid',
    gestureSurface: 'Overlay gesture surface',
    locked: 'Overlay is locked',
    unlocked: 'Overlay is unlocked',
    hiddenPreview: 'Overlay hidden while held',
    skipToContent: 'Skip to main content',
  },
} as const;

export function helpStepsForBrowser(browser: BrowserName): readonly string[] {
  if (browser === 'safari') return strings.help.safariIos;
  if (browser === 'chrome' || browser === 'samsung' || browser === 'edge') {
    return strings.help.chromeAndroid;
  }
  return strings.help.desktop;
}

/** Minimal interpolation for the few strings that take values. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ''));
}
