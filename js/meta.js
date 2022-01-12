/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=4 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Author: Bob Hood
 * Date: 11 January 2022
 * Contact: bhood@mozilla.com
 */

var META_DATA = null;
var TIME_THRESHOLDS = [];
var RESET_AGE_BUCKET = {};

$(document).ready(function () {
    $("#applySettingsButton").click(function() {
        var x = $("form").serializeArray();
        var values = {};
        $.each(x, function(i, field) {
            values[field.name] = field.value;
        });

        var close_settings = true;
        var use_local = JSON.stringify(values).includes("remember");

        // API key
        var old_api_key = "";
        var key = sessionStorage.getItem("api-key");
        if(key == null) {
            key = localStorage.getItem("api-key");
        }
        if(key != null) {
            old_api_key = key;
        }

        if(old_api_key != values.key) {
            if(use_local) {
                localStorage.setItem("api-key", values.key);
            } else {
                sessionStorage.setItem("api-key", values.key);
            }
            close = false;
        }

        // Watch report(s)
        var old_bug_list = [];
        var cached_bugs = sessionStorage.getItem("watch-list");
        if(cached_bugs == null) {
            cached_bugs = localStorage.getItem("watch-list");
        }

        if(cached_bugs != null) {
            old_bug_list = JSON.parse(cached_bugs);
        }

        var new_bug_list = [];
        if(values.bug.length) {
            var bug_strings = values.bug.split(",");
            for(let i in bug_strings) {
                new_bug_list.push(parseInt(bug_strings[i]));
            }
        }

        // compare current report list to the form's
        if(old_bug_list.length != new_bug_list.length || !old_bug_list.every((val, index, array) => new_bug_list.indexOf(val) !== -1)) {
            if(use_local) {
                localStorage.setItem("watch-list", JSON.stringify(new_bug_list));
            }
            else {
                sessionStorage.setItem("watch-list", JSON.stringify(new_bug_list));
            }

            close = false;
        }

        // Refresh interval
        var refresh_interval = sessionStorage.getItem("refresh-interval");
        if(refresh_interval == null) {
            refresh_interval = localStorage.getItem("refresh-interval");
        }

        if(refresh_interval != null && parseInt(refresh_interval) != 0 && !values.refresh.length) {
            values.refresh = "0";
        }

        if(values.refresh.length) {
            if(use_local) {
                localStorage.setItem("refresh-interval", values.refresh);
            }
            else {
                sessionStorage.setItem("refresh-interval", values.refresh);
            }

            close = false;
        }

        if(close) {
            closeSettings();
        }
        else {
            window.location.reload(true);
        }
    });

    window.onclick = function (event) {
        var modal = document.getElementById('settingsPopup');
        if (event.target == modal) {
          closeForm();
        }
      }

    var data = {
        "meta" : {
            "show_bugzilla_url": "https://bugzilla.mozilla.org/show_bug.cgi?id=",
            "bugzilla_rest_url": "https://bugzilla.mozilla.org/rest/bug/",
            "fields_query" : "include_fields=summary,depends_on,priority,severity,type,creation_time,last_change_time,status,keywords",
            "refresh_every" : 0,
            "api_key" : "",
            "trackers" : []
        }
    };

    main(data);

    // can't get the above data to load from a file using jQuery $.getJSON();
    // it generates errors without any explanation.  any insights would be
    // appreciated.

    // $.getJSON('js/meta.json', function(data) {
    //     main(data);
    // })
    // .error(function(jqXHR, textStatus, errorThrown) {
    //     console.log("error " + textStatus);
    //     console.log("incoming Text " + jqXHR.responseText);
    // })
    // .fail(function( jqxhr, textStatus, error ) {
    //     console.log("error " + textStatus);
    //     console.log("incoming Text " + jqxhr.responseText);
    //     // var err = `${textStatus}, ${error}`;
    //     // console.log( "Request Failed: " + err );
    // });
});

function main(json)
{
                /* one day */ TIME_THRESHOLDS.push(86400);
               /* one week */ TIME_THRESHOLDS.push(86400 * 7);
    /* one month (roughly) */ TIME_THRESHOLDS.push(86400 * 30);
     /* one year (roughly) */ TIME_THRESHOLDS.push(86400 * 365);
    /* greater than a year */ TIME_THRESHOLDS.push(Number.MAX_SAFE_INTEGER);

    META_DATA = json.meta;

    var api_key = sessionStorage.getItem("api-key");
    if(api_key == null) {
        api_key = localStorage.getItem("api-key");
    }
    META_DATA.api_key = (api_key == null) ? "" : api_key;

    var watch_list = sessionStorage.getItem("watch-list");
    if(watch_list == null) {
        watch_list = localStorage.getItem("watch-list");
    }
    META_DATA.trackers = (watch_list == null) ? [] : JSON.parse(watch_list);

    var refresh_interval = sessionStorage.getItem("refresh-interval");
    if(refresh_interval == null) {
        refresh_interval = localStorage.getItem("refresh-interval");
    }
    if(refresh_interval != null) {
        META_DATA.refresh_every = parseInt(refresh_interval);
    }

    var count = META_DATA.trackers.length;
    for (var i = 0; i < count; ++i) {
        var parent_id = META_DATA.trackers[i];

        RESET_AGE_BUCKET[parent_id] = {};
        RESET_AGE_BUCKET[parent_id]["gtyear-" + parent_id] = false;
        RESET_AGE_BUCKET[parent_id]["oneyear-" + parent_id] = false;
        RESET_AGE_BUCKET[parent_id]["onemonth-" + parent_id] = false;
        RESET_AGE_BUCKET[parent_id]["oneweek-" + parent_id] = false;
        RESET_AGE_BUCKET[parent_id]["oneday-" + parent_id] = false;
    }

    // initialize (clean) the content area
    initializeContent();

    // perform the initial (unrestricted) display
    populateTrackers();

    if(META_DATA.refresh_every != 0) {
        setInterval(function() {
            initializeContent();
            populateTrackers();
          }, META_DATA.refresh_every * 1000);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

function initializeContent()
{
    var count = META_DATA.trackers.length;

    if (count) {
        var columns = 1;
        if(count > 1) {
            columns = (count & 1) ? 3 : 2;
        }
    
        var content = "";
        if(columns != 1) {
            content = "<div class=\"grid-container\">\n";
        }

        col = columns;
        for (var i = 0; i < count; ++i) {
            var parent_id = META_DATA.trackers[i];

            var initial_id = "reportDiv-" + parent_id;
            var divData = "<div class=\"tracker\" id=\"" + initial_id + "\"></div>\n";

            var metabug_id = "metabug-" + parent_id;
            var div = document.getElementById(metabug_id);

            // if we have already constructed the display, then
            // only selectively update it...
            if(div != null) {
                // flag each age section of each metabug as needing to be refreshed
                RESET_AGE_BUCKET[parent_id]["gtyear-" + parent_id] = true;
                RESET_AGE_BUCKET[parent_id]["oneyear-" + parent_id] = true;
                RESET_AGE_BUCKET[parent_id]["onemonth-" + parent_id] = true;
                RESET_AGE_BUCKET[parent_id]["oneweek-" + parent_id] = true;
                RESET_AGE_BUCKET[parent_id]["oneday-" + parent_id] = true;
            } else {
                // no; add a new one
                if(columns != 1) {
                    content += "<div class=\"grid-item\">\n";
                }

                content += divData;

                if(columns != 1) {
                    content += "</div>\n";
                }
            }
        }

        if(content.length) {
            if(columns != 1) {
                content += "</div>";
            }
            $("#content").replaceWith(content);
        }
    }
}

function populateTrackers()
{
    var parental_level = 0;
    var count = META_DATA.trackers.length;
    for (var i = 0; i < count; ++i)
    {
        var tracker_id = META_DATA.trackers[i]
        var url = META_DATA.bugzilla_rest_url + tracker_id + "?";
        if(META_DATA.api_key.length) {
            url += "api_key=" + META_DATA.api_key + "&";
        }
        url += META_DATA.fields_query;

        $.ajax({
            url: url,
            tracker_id: tracker_id,
            parental_level: parental_level,
            success: function(data) {
                processTracker(this.tracker_id, 0, data, this.parental_level);
            }
        })
        .error(function(jqXHR, textStatus, errorThrown) {
            console.log("error " + textStatus);
            console.log("incoming Text " + jqXHR.responseText);
        });
    }
}

function processTracker(parent_id, depend_id, data, parental_level)
{
    var d = data.bugs[0];  // shorthand

    if(parental_level == 0)
    {
        assert(depend_id == 0, "Dependent ID is not zero at parental level 0!");

        // this is the tracker meta-bug; initialize the structure

        var count = META_DATA.trackers.length;
        var link = META_DATA.show_bugzilla_url + parent_id;
        var klass = (count == 1) ? "metabug-single" : "metabug-grid";

        var metabug_id = "metabug-" + parent_id;
        var div = document.getElementById(metabug_id);
        if(div == null) {
            $("#reportDiv-" + parent_id).replaceWith("<div class=\"" + klass + "\" id=\"metabug-" + parent_id + "\">\n"
                + "<h1>&#10748;&nbsp;<a href=\"" + link + "\">" + parent_id + "</a>&nbsp;&#10749;</h1>\n"
                + "<h2>" + d.summary + "</h2>\n"
                + "<div class=\"history-\"" + parent_id + ">\n"
                + "&#10205;&mdash;&mdash;&mdash;&mdash; &#10532; Year &mdash;&mdash;&mdash;&mdash;&#10206;\n"
                + "<div class=\"gtyear\" id=\"gtyear-" + parent_id + "\"></div>\n"
                + "&#10205;&mdash;&mdash;&mdash;&mdash; &#10534; Year &mdash;&mdash;&mdash;&mdash;&#10206;\n"
                + "<div class=\"oneyear\" id=\"oneyear-" + parent_id + "\"></div>\n"
                + "&#10205;&mdash;&mdash;&mdash;&mdash; &#10534; Month &mdash;&mdash;&mdash;&mdash;&#10206;\n"
                + "<div class=\"onemonth\" id=\"onemonth-" + parent_id + "\"></div>\n"
                + "&#10205;&mdash;&mdash;&mdash;&mdash; &#10534; Week &mdash;&mdash;&mdash;&mdash;&#10206;\n"
                + "<div class=\"oneweek\" id=\"oneweek-" + parent_id + "\"></div>\n"
                + "&#10205;&mdash;&mdash;&mdash;&mdash; &#10534; Day &mdash;&mdash;&mdash;&mdash;&#10206;\n"
                + "<div class=\"oneday\" id=\"oneday-" + parent_id + "\"></div>\n"
                + "</div>\n"
                + "</div>\n"
            );
        }

        var count = d.depends_on.length;
        for (var i = 0; i < count; ++i)
        {
            var url = META_DATA.bugzilla_rest_url + d.depends_on[i] + "?";
            if(META_DATA.api_key.length) {
                url += "api_key=" + META_DATA.api_key + "&";
            }
            url += META_DATA.fields_query;

            $.ajax({
                url: url,
                parent_id: parent_id,
                depend_id: d.depends_on[i],
                parental_level: parental_level + 1,
                success: function(data) {
                    processTracker(this.parent_id, this.depend_id, data, this.parental_level);
                }
            });
        }
    }
    else    // this is a child report (dependency)
    {
        assert(depend_id != 0, "Dependent ID is zero at parental level >0!");

        var date1 = new Date(d.creation_time).valueOf();
        var date2 = new Date(d.last_change_time).valueOf();

        var rd1 = Math.round(date1 / 1000);
        var rd2 = Math.round(date2 / 1000);

        var now = new Date().valueOf();
        var now_secs = Math.round(now / 1000);

        var creation_age = now_secs - rd1;
        var activity_age = now_secs - rd2;

        var id = "";
        var div = null;
        var reset = false;

        // place the report into the proper age bucket
        if(activity_age < TIME_THRESHOLDS[0]) {  // created within the last 24 hours
            id = "oneday-" + parent_id;
        }
        else if(activity_age < TIME_THRESHOLDS[1]) { // created within the last week
            id = "oneweek-" + parent_id;
        }
        else if(activity_age < TIME_THRESHOLDS[2]) { // created within the last month (roughly)
            id = "onemonth-" + parent_id;
        }
        else if(activity_age < TIME_THRESHOLDS[3]) { // created within the last year (roughly)
            id = "oneyear-" + parent_id;
        }
        else {  // older than a year (roughly)
            id = "gtyear-" + parent_id;
        }

        div = document.getElementById(id);
        if(RESET_AGE_BUCKET[parent_id][id]) {
            div.innerHTML = "";
            RESET_AGE_BUCKET[parent_id][id] = false;
        }

        assert(div != null, "div is null!");

        // elide the title
        var title = d.summary;
        if(d.summary.length > 60) {
            title = d.summary.substr(0, 57);
            title += "...";
        }

        var display = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
        if(creation_age < TIME_THRESHOLDS[1]) {
            // new report
            display = "<img src=\"images/new.png\">&nbsp;"; 
        }

        // see if we have any security keywords
        var have_sec_bug = d.keywords.some(function(value, index, array) {
            return value == "sec-high" || value == "sec-critical";
        });

        if(have_sec_bug) {   // sec bug implies defect
            display += "<img src=\"images/security.png\">&nbsp;&nbsp;";
        }
        else if(d.type.toLowerCase() == "defect") {
            display += "<img src=\"images/defect.png\">&nbsp;&nbsp;";
        }
        else if(d.type.toLowerCase() == "task") {
            display += "<img src=\"images/task.png\">&nbsp;&nbsp;";
        }
        else if(d.type.toLowerCase() == "enhancement") {
            display += "<img src=\"images/enhancement.png\">&nbsp;&nbsp;";
        }
        display += "<b>" + depend_id + "</b>: " + title;

        var link = META_DATA.show_bugzilla_url + depend_id;
        div.innerHTML += "<div id=\""
                        + depend_id
                        + "\"><a href=\""
                        + link
                        + "\" target=\"_blank\" rel=\"noopener noreferrer\">"
                        + display
                        + "</a></div>\n";

        // sort entries as they are added
        var entries = div.children;
        if(entries.length > 1) {
            entries = Array.prototype.slice.call(entries, 0);
            entries.sort(function(a, b){
                var a_ord = +a.id;
                var b_ord = +b.id;
                return a_ord - b_ord;
            });
    
            div.innerHTML = "";
    
            for(var i = 0, l = entries.length;i < l; ++i) {
                div.appendChild(entries[i]);
            }
        }
    }
}

function openSettings() {
    if(META_DATA.api_key.length) {
        var api_key = document.getElementById("api-key");
        api_key.value = META_DATA.api_key;
    }
    if(META_DATA.refresh_every != 0) {
        var refresh_interval = document.getElementById("refresh-interval");
        refresh_interval.value = '' + META_DATA.refresh_every;
    }
    if(META_DATA.trackers.length) {
        var tracker_strings = "";
        for(let i in META_DATA.trackers) {
            if(i > 0) {
                tracker_strings += ", ";
            }
            tracker_strings += '' + META_DATA.trackers[i];
        }
        var watch_bugs = document.getElementById("watch-bug");
        watch_bugs.value = tracker_strings;
    }

    document.getElementById("popupForm").style.display = "block";
 }
  
  function closeSettings() {
    document.getElementById("popupForm").style.display = "none";
  }
