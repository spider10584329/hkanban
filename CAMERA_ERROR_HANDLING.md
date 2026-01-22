# Camera Error Handling Guide

## Overview

The QR Scanner has been updated with comprehensive error handling to provide clear, user-friendly feedback when camera access fails. Instead of showing generic error messages, the system now uses toast notifications with specific guidance for each type of camera issue.

## Error Scenarios & Handling

### 1. **No Camera Available** (Device has no camera)
**Toast Notification:**
- Type: Warning (Yellow)
- Title: "No Camera Available"
- Message: "No camera was detected on this device. Please use the manual entry form instead."

**When This Occurs:**
- Desktop computers without webcams
- Virtual machines
- Devices with physically disabled cameras

**User Action:**
- Use the Manual Entry form on the right side of the screen
- Enter product SKU/code manually
- Submit request without scanning

---

### 2. **Camera Permission Denied** (User blocked camera access)
**Toast Notification:**
- Type: Error (Red)
- Title: "Camera Permission Denied"
- Message: "Please allow camera access in your browser settings to use the QR scanner."

**When This Occurs:**
- User clicked "Block" on permission prompt
- Browser settings deny camera access
- System settings restrict camera for the browser

**User Action:**
1. **Chrome/Edge:**
   - Click the lock icon in address bar
   - Set Camera to "Allow"
   - Refresh the page

2. **Firefox:**
   - Click the lock icon in address bar
   - Under Permissions, allow Camera
   - Refresh the page

3. **Safari:**
   - Safari → Preferences → Websites → Camera
   - Allow for this website

---

### 3. **Camera In Use** (Another app is using the camera)
**Toast Notification:**
- Type: Error (Red)
- Title: "Camera In Use"
- Message: "The camera is being used by another application. Please close other apps and try again."

**When This Occurs:**
- Video conferencing app is open (Zoom, Teams, etc.)
- Another browser tab is using the camera
- Background app has camera access
- Multiple instances of the app are running

**User Action:**
- Close other applications using the camera
- Close other browser tabs with camera access
- Check system tray for camera-using apps
- Restart browser if needed

---

### 4. **Camera Not Supported** (Browser doesn't support camera API)
**Toast Notification:**
- Type: Error (Red)
- Title: "Camera Not Supported"
- Message: "Your browser does not support camera access. Please try a different browser or use manual entry."

**When This Occurs:**
- Very old browser versions
- Non-standard or custom browsers
- Browsers with disabled WebRTC

**User Action:**
- Update browser to latest version
- Use a modern browser (Chrome, Firefox, Edge, Safari)
- Use manual entry as alternative

---

### 5. **Camera Configuration Error**
**Toast Notification:**
- Type: Error (Red)
- Title: "Camera Configuration Error"
- Message: "Unable to configure camera with the requested settings. Try using manual entry."

**When This Occurs:**
- Camera doesn't support required resolution
- Environmental constraints can't be met
- Incompatible camera specifications

**User Action:**
- Try a different device
- Use manual entry
- Contact support if persistent

---

### 6. **Camera Initialization Success**
**Toast Notification:**
- Type: Success (Green)
- Title: "Camera Started"
- Message: "Point your camera at a QR code to scan."

**When This Occurs:**
- Camera successfully activated
- Scanner is ready to use
- All permissions granted

**User Action:**
- Position QR code in the frame
- Hold steady for 1-2 seconds
- Wait for automatic detection

---

### 7. **Scanner Stopped**
**Toast Notification:**
- Type: Info (Blue)
- Title: "Scanner Stopped"
- Message: "Camera has been turned off."

**When This Occurs:**
- User clicks "Stop Scanning" button
- Scanner is manually deactivated
- Component unmounts

**User Action:**
- Click "Start Camera" to scan again
- Or use manual entry

---

## Pre-Flight Checks

Before attempting to start the camera, the system performs these checks:

### 1. **Browser API Support Check**
```javascript
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
```
- Verifies browser supports camera access
- Shows "Camera Not Supported" if missing

### 2. **Device Enumeration Check**
```javascript
const devices = await navigator.mediaDevices.enumerateDevices();
const videoDevices = devices.filter(device => device.kind === 'videoinput');
```
- Lists available cameras
- Shows "No Camera Found" if empty

### 3. **Permission Check**
- Requests camera access from user
- Handles denial gracefully
- Provides clear recovery steps

---

## Error Types Reference

| Error Name | Error Handling | User-Friendly Message |
|------------|----------------|----------------------|
| `NotAllowedError` | Permission denied | Camera Permission Denied |
| `PermissionDeniedError` | Permission denied | Camera Permission Denied |
| `NotFoundError` | No camera | No Camera Available |
| `DevicesNotFoundError` | No camera | No Camera Available |
| `NotReadableError` | Camera in use | Camera In Use |
| `TrackStartError` | Camera in use | Camera In Use |
| `OverconstrainedError` | Config error | Camera Configuration Error |
| `ConstraintNotSatisfiedError` | Config error | Camera Configuration Error |
| `NotSupportedError` | Not supported | Camera Not Supported |
| Other | Generic | Camera Error |

---

## Benefits of This Approach

### ✅ **Better User Experience**
- Clear, actionable error messages
- No scary technical jargon
- Specific guidance for each issue

### ✅ **Non-Blocking Errors**
- Toast notifications don't block the UI
- User can dismiss or ignore
- Auto-dismiss after 5 seconds

### ✅ **Alternative Path Available**
- Manual entry always available
- No dead ends
- Users never stuck

### ✅ **Graceful Degradation**
- Works even without camera
- Detects camera absence early
- Prevents confusing errors

---

## Testing Scenarios

### Test 1: Device Without Camera
**Expected:** Warning toast → "No Camera Available"
**Action:** Use manual entry

### Test 2: Deny Camera Permission
**Expected:** Error toast → "Camera Permission Denied"
**Action:** Show how to enable in browser

### Test 3: Camera In Use by Another App
**Expected:** Error toast → "Camera In Use"
**Action:** Close other apps

### Test 4: Successful Camera Start
**Expected:** Success toast → "Camera Started"
**Action:** Begin scanning

### Test 5: Manual Stop
**Expected:** Info toast → "Scanner Stopped"
**Action:** Camera turns off

---

## Developer Notes

### Why Toast Notifications?

1. **Non-Intrusive:** Doesn't block workflow
2. **Auto-Dismiss:** Clears automatically
3. **Stackable:** Multiple toasts can appear
4. **Colored by Severity:** Visual hierarchy
5. **Consistent:** Matches app design pattern

### Why Pre-Flight Checks?

1. **Early Detection:** Find issues before camera start
2. **Specific Messages:** Know exact problem
3. **Better Performance:** Don't waste time on failed attempts
4. **User Confidence:** Clear expectations set early

### Error Recovery Strategy

```
Error Detected → Show Toast → Suggest Alternative → Allow Retry
```

Each error provides:
1. What went wrong
2. Why it might have happened
3. What the user should do next
4. An alternative path (manual entry)

---

## Common Questions

**Q: Why not show error messages in the UI instead of toasts?**
A: Toasts are less intrusive, auto-dismiss, and don't occupy permanent screen space. Users can continue working while seeing the notification.

**Q: What if a user ignores the toast?**
A: The manual entry form is always available as a fallback. Toast is just guidance, not a blocker.

**Q: Can I test camera errors without having the actual problem?**
A: Yes, you can manually trigger errors by:
- Denying permissions when prompted
- Having another app use the camera
- Using a browser without camera support

**Q: What happens on mobile devices?**
A: Mobile devices typically have cameras, so the most common scenarios are:
- Permission denial → Clear instructions to enable
- Camera in use → Guide to close other apps
- Successful operation → Smooth scanning experience

---

## Summary

The improved camera error handling:
- ✅ Detects camera availability before attempting to start
- ✅ Provides specific, actionable error messages
- ✅ Uses toast notifications for better UX
- ✅ Always offers manual entry as fallback
- ✅ Handles all common camera failure scenarios
- ✅ Guides users to successful task completion

**Result:** Users are never stuck, always informed, and can always complete their task.
