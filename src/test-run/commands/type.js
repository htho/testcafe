// -------------------------------------------------------------
// WARNING: this file is used by both the client and the server.
// Do not use any browser or node-specific API!
// -------------------------------------------------------------

export default {
    dispatchEvent:                       'dispatch-event',
    click:                               'click',
    rightClick:                          'right-click',
    doubleClick:                         'double-click',
    drag:                                'drag',
    dragToElement:                       'drag-to-element',
    hover:                               'hover',
    scroll:                              'scroll',
    scrollBy:                            'scroll-by',
    scrollIntoView:                      'scroll-into-view',
    typeText:                            'type-text',
    selectText:                          'select-text',
    selectTextAreaContent:               'select-text-area-content',
    selectEditableContent:               'select-editable-content',
    pressKey:                            'press-key',
    wait:                                'wait',
    navigateTo:                          'navigate-to',
    setFilesToUpload:                    'set-files-to-upload',
    clearUpload:                         'clear-upload',
    executeClientFunction:               'execute-client-function',
    executeSelector:                     'execute-selector',
    takeScreenshot:                      'take-screenshot',
    takeElementScreenshot:               'take-element-screenshot',
    takeScreenshotOnFail:                'take-screenshot-on-fail',
    prepareBrowserManipulation:          'prepare-browser-manipulation',
    showAssertionRetriesStatus:          'show-assertion-retries-status',
    hideAssertionRetriesStatus:          'hide-assertion-retries-status',
    setBreakpoint:                       'set-breakpoint',
    resizeWindow:                        'resize-window',
    resizeWindowToFitDevice:             'resize-window-to-fit-device',
    maximizeWindow:                      'maximize-window',
    switchToIframe:                      'switch-to-iframe',
    switchToMainWindow:                  'switch-to-main-window',
    openWindow:                          'open-window',
    closeWindow:                         'close-window',
    getCurrentWindow:                    'get-current-window',
    getCurrentWindows:                   'get-current-windows',
    getCurrentCDPSession:                'get-current-c-d-p-session',
    switchToWindow:                      'switch-to-window',
    switchToWindowByPredicate:           'switch-to-window-by-predicate',
    switchToParentWindow:                'switch-to-parent-window',
    switchToPreviousWindow:              'switch-to-previous-window',
    setNativeDialogHandler:              'set-native-dialog-handler',
    getNativeDialogHistory:              'get-native-dialog-history',
    getBrowserConsoleMessages:           'get-browser-console-messages',
    getActiveElement:                    'get-active-element',
    setTestSpeed:                        'set-test-speed',
    setPageLoadTimeout:                  'set-page-load-timeout',
    debug:                               'debug',
    assertion:                           'assertion',
    useRole:                             'useRole',
    testDone:                            'test-done',
    backupStorages:                      'backup-storages',
    executeExpression:                   'execute-expression',
    executeAsyncExpression:              'execute-async-expression',
    unlockPage:                          'unlock-page',
    closeChildWindowOnFileDownloading:   'close-child-window-on-file-downloading',
    recorder:                            'recorder',
    prepareClientEnvironmentInDebugMode: 'prepare-client-environment-in-debug-mode',
    getCookies:                          'get-cookies',
    setCookies:                          'set-cookies',
    deleteCookies:                       'delete-cookies',
    getProxyUrl:                         'get-proxy-url',
    request:                             'request',
    skipJsErrors:                        'skip-js-errors',
    addRequestHooks:                     'add-request-hooks',
    removeRequestHooks:                  'remove-request-hooks',
    runCustomAction:                     'run-custom-action',
    report:                              'report',
};
