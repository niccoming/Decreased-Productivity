// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph

'use strict';

var cloakedTabs = [];
var uncloakedTabs = [];
var contextLoaded = false;
var dpicon, dptitle;
var blackList = [], whiteList = [];
var settings = {};

// ----- Initialization
// Load settings from chrome.storage.local on service worker startup
var initPromise = chrome.storage.local.get(null).then(function(stored) {
	settings = stored;
	setDefaultOptions();
	initLists();
	dpicon = settings["iconType"] || 'coffee';
	dptitle = settings["iconTitle"] || 'Decreased Productivity';
});

// ----- Supporting Functions

function enabled(tab, providedIndex) {
	var dpdomaincheck = domainCheck(extractDomainFromURL(tab.url));
	var dpcloakindex = (typeof providedIndex !== 'undefined') ? providedIndex : cloakedTabs.indexOf(tab.windowId+"|"+tab.id);
	if ((settings["enable"] == "true" || dpdomaincheck == '1') && dpdomaincheck != '0' && (settings["global"] == "true" || (settings["global"] == "false" && (dpcloakindex != -1 || settings["newPages"] == "Cloak" || dpdomaincheck == '1')))) return 'true';
	return 'false';
}
function domainCheck(domain) {
	if (!domain) return '-1';
	if (in_array(domain, whiteList) == '1') return '0';
	if (in_array(domain, blackList) == '1') return '1';
	return '-1';
}
function in_array(needle, haystack) {
	if (!haystack || !needle) return false;
	if (binarySearch(haystack, needle) != -1) return '1';
	if (needle.indexOf('www.') == 0) {
		if (binarySearch(haystack, needle.substring(4)) != -1) return '1';
	}
	for (var i in haystack) {
		if (haystack[i].indexOf("*") == -1 && haystack[i].indexOf("?") == -1) continue;
		if (new RegExp('^(?:www\\.|^)(?:'+haystack[i].replace(/\./g, '\\.').replace(/^\[/, '\\[').replace(/\]$/, '\\]').replace(/\?/g, '.').replace(/\*/g, '[^.]+')+')').test(needle)) return '1';
	}
	return false;
}
function binarySearch(list, item) {
    var min = 0;
    var max = list.length - 1;
    var guess;
	var bitwise = (max <= 2147483647) ? true : false;
	if (bitwise) {
		while (min <= max) {
			guess = (min + max) >> 1;
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	} else {
		while (min <= max) {
			guess = Math.floor((min + max) / 2);
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	}
    return -1;
}
function extractDomainFromURL(url) {
	if (!url) return "";
	if (url.indexOf("://") != -1) url = url.substr(url.indexOf("://") + 3);
	if (url.indexOf("/") != -1) url = url.substr(0, url.indexOf("/"));
	if (url.indexOf("@") != -1) url = url.substr(url.indexOf("@") + 1);
	if (url.match(/^(?:\[[A-Fa-f0-9:.]+\])(:[0-9]+)?$/g)) {
		if (url.indexOf("]:") != -1) return url.substr(0, url.indexOf("]:")+1);
		return url;
	}
	if (url.indexOf(":") > 0) url = url.substr(0, url.indexOf(":"));
	return url;
}
function domainHandler(domain, action) {
	if (!settings['whiteList']) settings['whiteList'] = JSON.stringify([]);
	if (!settings['blackList']) settings['blackList'] = JSON.stringify([]);
	var tempWhitelist = JSON.parse(settings['whiteList']);
	var tempBlacklist = JSON.parse(settings['blackList']);

	// Remove domain from whitelist and blacklist
	var pos = tempWhitelist.indexOf(domain);
	if (pos > -1) tempWhitelist.splice(pos, 1);
	pos = tempBlacklist.indexOf(domain);
	if (pos > -1) tempBlacklist.splice(pos, 1);

	switch(action) {
		case 0:	// Whitelist
			tempWhitelist.push(domain);
			break;
		case 1:	// Blacklist
			tempBlacklist.push(domain);
			break;
		case 2:	// Remove
			break;
	}

	settings['blackList'] = JSON.stringify(tempBlacklist);
	settings['whiteList'] = JSON.stringify(tempWhitelist);
	chrome.storage.local.set({
		blackList: settings['blackList'],
		whiteList: settings['whiteList']
	});
	blackList = tempBlacklist.sort();
	whiteList = tempWhitelist.sort();
	return false;
}
// ----- Options
function optionExists(opt) {
	return (typeof settings[opt] !== 'undefined');
}
function defaultOptionValue(opt, val) {
	if (!optionExists(opt)) settings[opt] = val;
}
function setDefaultOptions() {
	var version = chrome.runtime.getManifest().version;
	defaultOptionValue("version", version);
	defaultOptionValue("enable", "true");
	defaultOptionValue("enableToggle", "true");
	defaultOptionValue("hotkey", "CTRL F12");
	defaultOptionValue("paranoidhotkey", "ALT P");
	defaultOptionValue("global", "false");
	defaultOptionValue("newPages", "Uncloak");
	defaultOptionValue("sfwmode", "SFW");
	defaultOptionValue("savedsfwmode", "");
	defaultOptionValue("opacity1", "0.05");
	defaultOptionValue("opacity2", "0.5");
	defaultOptionValue("collapseimage", "false");
	defaultOptionValue("showIcon", "true");
	defaultOptionValue("iconType", "coffee");
	defaultOptionValue("iconTitle", "Decreased Productivity");
	defaultOptionValue("disableFavicons", "false");
	defaultOptionValue("hidePageTitles", "false");
	defaultOptionValue("pageTitleText", "Google Chrome");
	defaultOptionValue("enableStickiness", "false");
	defaultOptionValue("maxwidth", "0");
	defaultOptionValue("maxheight", "0");
	defaultOptionValue("showContext", "true");
	defaultOptionValue("showUnderline", "true");
	defaultOptionValue("removeBold", "false");
	defaultOptionValue("showUpdateNotifications", "true");
	defaultOptionValue("font", "Arial");
	defaultOptionValue("customfont", "");
	defaultOptionValue("fontsize", "12");
	defaultOptionValue("s_bg", "FFFFFF");
	defaultOptionValue("s_link", "000099");
	defaultOptionValue("s_table", "cccccc");
	defaultOptionValue("s_text", "000000");
	defaultOptionValue("customcss", "");
	// fix hotkey shortcut if in old format (if using + as separator instead of space)
	if (settings["hotkey"] && settings["hotkey"].indexOf('+') != -1) {
		settings["hotkey"] = settings["hotkey"].replace(/\+$/, "APLUSA").replace(/\+/g, " ").replace(/APLUSA/, "+");
	}
	// delete old option if exists
	if (optionExists("globalEnable")) delete settings["globalEnable"];
	// delete old option if exists
	if (optionExists("style")) delete settings["style"];
	// set SFW Level to SFW (for new change in v0.46.3)
	if (settings["sfwmode"] == "true") settings["sfwmode"] = "SFW";
	if (!optionExists("blackList")) settings['blackList'] = JSON.stringify([]);
	if (!optionExists("whiteList")) settings['whiteList'] = JSON.stringify([]);

	chrome.storage.local.set(settings);
}

// ----- Context Menu Setup (created on install; persists across service worker restarts)
chrome.runtime.onInstalled.addListener(function() {
	initPromise.then(function() {
		chrome.contextMenus.removeAll(function() {
			chrome.contextMenus.create({"id": "whitelist", "title": chrome.i18n.getMessage("whitelistdomain"), "contexts": ['action']});
			chrome.contextMenus.create({"id": "blacklist", "title": chrome.i18n.getMessage("blacklistdomain"), "contexts": ['action']});
			chrome.contextMenus.create({"id": "removelist", "title": chrome.i18n.getMessage("removelist"), "contexts": ['action']});
			if (settings["showContext"] == 'true') {
				chrome.contextMenus.create({"id": "opensafely", "title": chrome.i18n.getMessage("opensafely"), "contexts": ['link', 'image']});
				contextLoaded = true;
			}
		});
	});
});

// Handle all context menu clicks via onClicked listener
chrome.contextMenus.onClicked.addListener(function(info, tab) {
	initPromise.then(function() {
		if (info.menuItemId === 'whitelist') {
			if (tab.url.substring(0, 4) != 'http') return;
			domainHandler(extractDomainFromURL(tab.url), 0);
			if (settings["enable"] == "true") magician('false', tab.id);
		} else if (info.menuItemId === 'blacklist') {
			if (tab.url.substring(0, 4) != 'http') return;
			domainHandler(extractDomainFromURL(tab.url), 1);
			if (settings["enable"] == "true") magician('true', tab.id);
		} else if (info.menuItemId === 'removelist') {
			if (tab.url.substring(0, 4) != 'http') return;
			domainHandler(extractDomainFromURL(tab.url), 2);
			if (settings["enable"] == "true") {
				var flag = 'false';
				if (settings['newPages'] == 'Cloak' || settings['global'] == 'true') flag = 'true';
				magician(flag, tab.id);
			}
		} else if (info.menuItemId === 'opensafely') {
			newCloak(info, tab);
		}
	});
});

// Called by clicking on the context menu item
function newCloak(info, tab) {
	// Enable cloaking (in case its been disabled) and open the link in a new tab
	settings["enable"] = "true";
	chrome.storage.local.set({enable: "true"});
	// If it's an image, load the "src" attribute
	if (info.mediaType) chrome.tabs.create({'url': info.srcUrl}, function(tab){ cloakedTabs.push(tab.windowId+"|"+tab.id); recursiveCloak('true', settings["global"], tab.id); });
	// Else, it's a normal link, so load the linkUrl.
	else chrome.tabs.create({'url': info.linkUrl}, function(tab){ cloakedTabs.push(tab.windowId+"|"+tab.id); recursiveCloak('true', settings["global"], tab.id); });
}

// Add/remove the "Open Safely" context menu item based on showContext setting
function dpContext() {
	if (settings["showContext"] == 'true' && !contextLoaded) {
		chrome.contextMenus.create({"id": "opensafely", "title": chrome.i18n.getMessage("opensafely"), "contexts": ['link', 'image']}, function() {
			if (chrome.runtime.lastError) { /* already exists */ }
		});
		contextLoaded = true;
	} else if (settings["showContext"] != 'true' && contextLoaded) {
		chrome.contextMenus.remove("opensafely", function() {
			if (chrome.runtime.lastError) { /* didn't exist */ }
		});
		contextLoaded = false;
	}
}

// ----- Main Functions
function checkChrome(url) {
	if (url.substring(0, 6) == 'chrome') return true;
	return false;
}
function hotkeyChange() {
	chrome.windows.getAll({"populate":true}, function(windows) {
		windows.forEach(function(chromeWindow) {
			chromeWindow.tabs.forEach(function(tab) {
				if (!checkChrome(tab.url)) {
					chrome.scripting.executeScript({
						target: {tabId: tab.id, allFrames: true},
						func: function(enableToggle, hotkey, paranoidhotkey) {
							hotkeySet(enableToggle, hotkey, paranoidhotkey);
						},
						args: [settings["enableToggle"], settings["hotkey"], settings["paranoidhotkey"]]
					}).catch(function() {});
				}
			});
		});
	});
}
function optionsSaveTrigger(prevglob, newglob) {
	var enable = settings["enable"];
	var global = newglob;
	if (prevglob == 'true' && newglob == 'false') {
		global = 'true';
		enable = 'false';
	}
	if (global == 'false') {
		for (var i = cloakedTabs.length-1; i >= 0; --i) {
			magician(enable, parseInt(cloakedTabs[i].split("|")[1]));
		}
		if (enable == 'false') cloakedTabs = [];
	} else recursiveCloak(enable, global);
}
function recursiveCloak(enable, global, tabId) {
	if (global == 'true') {
		chrome.windows.getAll({"populate":true}, function(windows) {
			windows.forEach(function(chromeWindow) {
				chromeWindow.tabs.forEach(function(tab) {
					if (!checkChrome(tab.url)) {
						var enabletemp = enable;
						var dpdomaincheck = domainCheck(extractDomainFromURL(tab.url));
						// Ensure whitelisted or blacklisted tabs stay as they are
						if (enabletemp == 'true' && dpdomaincheck == '0') enabletemp = 'false';
						else if (enabletemp == 'false' && dpdomaincheck == '1') enabletemp = 'true';
						magician(enabletemp, tab.id);
						var dpTabId = tab.windowId+"|"+tab.id;
						var dpcloakindex = cloakedTabs.indexOf(dpTabId);
						var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
						if (enabletemp == 'false') {
							if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
							if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
						} else {
							if (dpcloakindex == -1) cloakedTabs.push(dpTabId);
							if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
						}
					}
				});
			});
		});
	} else {
		if (tabId) magician(enable, tabId);
	}
}
function magician(enable, tabId) {
	var disableFavicons = settings["disableFavicons"] == 'true';
	var hidePageTitles = settings["hidePageTitles"] == 'true';
	var pageTitleText = settings["pageTitleText"] || 'Google Chrome';
	var showIcon = settings["showIcon"];

	if (enable == 'true') {
		chrome.scripting.executeScript({
			target: {tabId: tabId, allFrames: true},
			func: function(disableFavicons, hidePageTitles, pageTitleText) {
				init();
				if (disableFavicons) faviconblank();
				else faviconrestore();
				if (hidePageTitles) { replaceTitle(pageTitleText); titleBind(pageTitleText); }
				else titleRestore();
			},
			args: [disableFavicons, hidePageTitles, pageTitleText]
		}).catch(function() {});
	} else {
		chrome.scripting.executeScript({
			target: {tabId: tabId, allFrames: true},
			func: function() { removeCss(); }
		}).catch(function() {});
	}

	if (showIcon == 'true') {
		if (enable == 'true') chrome.action.setIcon({path: "img/addressicon/"+dpicon+".png", tabId: tabId}).catch(function() {});
		else chrome.action.setIcon({path: "img/addressicon/"+dpicon+"-disabled.png", tabId: tabId}).catch(function() {});
		chrome.action.setTitle({title: dptitle, tabId: tabId}).catch(function() {});
		chrome.action.show(tabId).catch(function() {});
	} else chrome.action.hide(tabId).catch(function() {});
}
function dpHandle(tab) {
	if (checkChrome(tab.url)) return;
	if (settings["global"] == "true" && domainCheck(extractDomainFromURL(tab.url)) != 1) {
		if (settings["enable"] == "true") {
			recursiveCloak('false', 'true');
			settings["enable"] = "false";
			chrome.storage.local.set({enable: "false"});
		} else {
			recursiveCloak('true', 'true');
			settings["enable"] = "true";
			chrome.storage.local.set({enable: "true"});
		}
	} else {
		var dpTabId = tab.windowId+"|"+tab.id;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId);
		var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
		settings["enable"] = "true";
		chrome.storage.local.set({enable: "true"});
		if (dpcloakindex != -1) {
			magician('false', tab.id);
			if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
			cloakedTabs.splice(dpcloakindex, 1);
		} else {
			magician('true', tab.id);
			cloakedTabs.push(dpTabId);
			if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
		}
	}
}
function setDPIcon() {
	dpicon = settings["iconType"] || 'coffee';
	dptitle = settings["iconTitle"] || 'Decreased Productivity';
	chrome.windows.getAll({"populate":true}, function(windows) {
		windows.forEach(function(chromeWindow) {
			chromeWindow.tabs.forEach(function(tab) {
				if (cloakedTabs.indexOf(tab.windowId+"|"+tab.id) != -1) chrome.action.setIcon({path: "img/addressicon/"+dpicon+".png", tabId: tab.id}).catch(function() {});
				else chrome.action.setIcon({path: "img/addressicon/"+dpicon+"-disabled.png", tabId: tab.id}).catch(function() {});
				chrome.action.setTitle({title: dptitle, tabId: tab.id}).catch(function() {});
				if (settings["showIcon"] == 'true') chrome.action.show(tab.id).catch(function() {});
				else chrome.action.hide(tab.id).catch(function() {});
			});
		});
	});
}
function initLists() {
	blackList = JSON.parse(settings['blackList'] || '[]').sort();
	whiteList = JSON.parse(settings['whiteList'] || '[]').sort();
}

// ----- Request library to support content script communication
chrome.tabs.onUpdated.addListener(function(tabid, changeinfo, tab) {
	if (changeinfo.status == "loading") {
		initPromise.then(function() {
			var dpTabId = tab.windowId+"|"+tabid;
			var dpcloakindex = cloakedTabs.indexOf(dpTabId);
			var enable = enabled(tab, dpcloakindex);
			if (settings["showIcon"] == "true") {
				if (enable == "true") chrome.action.setIcon({path: "img/addressicon/"+dpicon+".png", tabId: tabid}).catch(function() {});
				else chrome.action.setIcon({path: "img/addressicon/"+dpicon+"-disabled.png", tabId: tabid}).catch(function() {});
				chrome.action.setTitle({title: dptitle, tabId: tabid}).catch(function() {});
				chrome.action.show(tabid).catch(function() {});
			} else chrome.action.hide(tabid).catch(function() {});
			if (checkChrome(tab.url)) return;
			var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
			if (enable == "true") {
				magician('true', tabid);
				if (settings["global"] == "false" && settings["enable"] == "false") {
					settings["enable"] = "true";
					chrome.storage.local.set({enable: "true"});
				}
				if (dpcloakindex == -1) cloakedTabs.push(dpTabId);
				if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
			} else {
				if (settings["enableStickiness"] == "true") {
					if (tab.openerTabId) {
						if (cloakedTabs.indexOf(tab.windowId+"|"+tab.openerTabId) != -1 && dpuncloakindex == -1) {
							if (domainCheck(extractDomainFromURL(tab.url)) != '0') {
								magician('true', tabid);
								cloakedTabs.push(dpTabId);
								return;
							}
						}
						if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
						if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
					} else {
						chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
							if (tabs[0] && tabs[0].windowId == tab.windowId && cloakedTabs.indexOf(tabs[0].windowId+"|"+tabs[0].id) != -1 && dpuncloakindex == -1) {
								if (domainCheck(extractDomainFromURL(tab.url)) != '0') {
									magician('true', tabid);
									cloakedTabs.push(dpTabId);
									return;
								}
							}
							if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
							if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
						});
					}
				}
			}
		});
	}
});
chrome.tabs.onRemoved.addListener(function(tabid, windowInfo) {
	var dpTabId = windowInfo.windowId+"|"+tabid;
	var dpcloakindex = cloakedTabs.indexOf(dpTabId);
	var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
	if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
	if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
});
var requestDispatchTable = {
	"get-enabled": function(request, sender, sendResponse) {
		var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId);
		var enable = enabled(sender.tab, dpcloakindex);
		if (enable == 'true' && dpcloakindex == -1) cloakedTabs.push(dpTabId);
		sendResponse({enable: enable, background: settings["s_bg"], favicon: settings["disableFavicons"], hidePageTitles: settings["hidePageTitles"], pageTitleText: settings["pageTitleText"], enableToggle: settings["enableToggle"], hotkey: settings["hotkey"], paranoidhotkey: settings["paranoidhotkey"]});
	},
	"toggle": function(request, sender, sendResponse) {
		if (settings["savedsfwmode"] != "") {
			settings["sfwmode"] = settings["savedsfwmode"];
			settings["savedsfwmode"] = "";
			chrome.storage.local.set({sfwmode: settings["sfwmode"], savedsfwmode: ""});
			if (settings["global"] == "true") recursiveCloak('true', 'true');
			else {
				magician('true', sender.tab.id);
				var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
				var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
				if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
				if (cloakedTabs.indexOf(dpTabId) == -1) cloakedTabs.push(dpTabId);
			}
			settings["enable"] = "true";
			chrome.storage.local.set({enable: "true"});
		} else {
			dpHandle(sender.tab);
		}
	},
	"toggleparanoid": function(request, sender, sendResponse) {
		if (settings["savedsfwmode"] == "") {
			settings["savedsfwmode"] = settings["sfwmode"];
			settings["sfwmode"] = "Paranoid";
			chrome.storage.local.set({savedsfwmode: settings["savedsfwmode"], sfwmode: "Paranoid"});
			if (settings["global"] == "true") recursiveCloak('true', 'true');
			else {
				magician('true', sender.tab.id);
				var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
				var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
				if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
				if (cloakedTabs.indexOf(dpTabId) == -1) cloakedTabs.push(dpTabId);
			}
			settings["enable"] = "true";
			chrome.storage.local.set({enable: "true"});
		} else {
			settings["sfwmode"] = settings["savedsfwmode"];
			settings["savedsfwmode"] = "";
			chrome.storage.local.set({sfwmode: settings["sfwmode"], savedsfwmode: ""});
			dpHandle(sender.tab);
		}
	},
	"get-settings": function(request, sender, sendResponse) {
		var enable, fontface;
		if (settings["font"] == '-Custom-') {
			if (settings["customfont"]) fontface = settings["customfont"];
			else fontface = 'Arial';
		} else fontface = settings["font"];
		if (settings["global"] == "false") enable = 'true';
		else enable = enabled(sender.tab);
		sendResponse({enable: enable, sfwmode: settings["sfwmode"], font: fontface, fontsize: settings["fontsize"], underline: settings["showUnderline"], background: settings["s_bg"], text: settings["s_text"], table: settings["s_table"], link: settings["s_link"], bold: settings["removeBold"], opacity1: settings["opacity1"], opacity2: settings["opacity2"], collapseimage: settings["collapseimage"], maxheight: settings["maxheight"], maxwidth: settings["maxwidth"], customcss: settings["customcss"]});
	},
	"options-save-trigger": function(request, sender, sendResponse) {
		// Reload settings from storage so we have the latest values from the options page
		chrome.storage.local.get(null, function(stored) {
			settings = stored;
			initLists();
			dpicon = settings["iconType"] || 'coffee';
			dptitle = settings["iconTitle"] || 'Decreased Productivity';
			dpContext();
			optionsSaveTrigger(request.prevglob, request.newglob);
		});
	},
	"hotkey-change": function(request, sender, sendResponse) {
		chrome.storage.local.get(null, function(stored) {
			settings = stored;
			hotkeyChange();
		});
	},
	"domain-handler": function(request, sender, sendResponse) {
		domainHandler(request.domain, request.action);
		sendResponse({whiteList: settings['whiteList'], blackList: settings['blackList']});
	},
	"init-lists": function(request, sender, sendResponse) {
		initLists();
	},
	"set-dp-icon": function(request, sender, sendResponse) {
		chrome.storage.local.get(null, function(stored) {
			settings = stored;
			setDPIcon();
		});
	}
};
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	initPromise.then(function() {
		if (request.reqtype in requestDispatchTable) requestDispatchTable[request.reqtype](request, sender, sendResponse);
		else sendResponse({});
	});
	return true; // Keep the message channel open for async sendResponse
});
// ----- If action icon is clicked, either enable or disable the cloak
chrome.action.onClicked.addListener(function(tab) {
	initPromise.then(function() {
		dpHandle(tab);
	});
});

chrome.runtime.onUpdateAvailable.addListener(function (details) {
	// an update is available, but wait until user restarts their browser as to not disrupt their current session and cloaked tabs.
});

