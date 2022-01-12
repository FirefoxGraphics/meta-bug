<p align="center">
    <img width="20%" alt="Metabug Tracker" src="https://user-images.githubusercontent.com/4536448/149044669-e3bef317-2ef0-4ebe-b595-bd8c15e18b2d.png">
</p>

# Bugzilla Dependency Tracker
Dependency tracking of Bugzilla reports.

## Summary
This dashboard is designed to provide visible (and optionally updating) dependency tracking for Bugzilla reports.  Such reports are referred to, in Mozllian parlance, as "meta-bugs."  However, you needn't limit it to such "meta-bugs": Any Bugzilla report in whose dependencies you have an interest can be displayed in this dashboard.

## Dependency Display
Dependencies are displayed grouped by age.  The aging criteria is the latest activity date of the dependency.  Aging "buckets" range from less than 24 hours to over a year.

![metabug-display](https://user-images.githubusercontent.com/4536448/149044823-c17e3422-f693-4c63-97ee-875b2fbaccca.png)

If a report was created within the last 24 hours, it will receive an additional icon on the dashboard to indicate that it is "new".

![firefox_2022-01-11_18-10-07](https://user-images.githubusercontent.com/4536448/149046054-cc6aa244-5dc3-4c38-bb9e-1e9943fe9151.png)

Each entry listed is a hyperlink, which will take you to the report in the Bugzilla system.  The "meta-bug" report number at the top is also a hyperlink and will take you to that report in Bugzilla.

## Settings
Initially, you will need to customize the settings of the dashboard for your specific needs.  Opening the "Setting" panel will present you with several values you can change.

![metabug-settings](https://user-images.githubusercontent.com/4536448/149045119-641f6a50-10ac-4623-a2bb-8fbf4ad6df7d.png)

### API Key
By default, you will see the dependencies of your report available to the public.  If you happen to have enhanced or elevelated privileges within Bugzilla (e.g. sec-bug access), you can enter your API key in the first field.  This API key will activate your privileges, and you can see additional information (if avaialble) for your report.

![metabug-elevated](https://user-images.githubusercontent.com/4536448/149045804-a481ea27-a1cf-4b8d-b523-5ff677ce6383.png)

The "API key" label for this field is a hyperlink that will take you to the Bugzilla page explaining what an API key is, and how to create one.

### Metabug(s)
Since the whole purpose of the dashboard is to monitor "meta-bugs", you will need to specify the reports to monitor in this field.  You can enter multiple report ids, separated by commas.  You can return and adjust this value later if you would like to change the trackers on your dashboard.

### Refresh Interval
You can instruct the dashboard to automatically refresh its information at intevals.  These intervals are measured in seconds.  Setting this value to zero (the default) will disable automatic refreshing--you can always manually refresh the page yourself.

### Always Remember My Settings
When you select "Apply", your dashboard seetings are automatically stored in session memory.  This means that they will remain active as long as your browser window is open.  When you close the window, any settings you have been using are discarded.

If you enable this option, your settings will be stored in the "global" area, which will cause them to persist between sessions in your browser.
