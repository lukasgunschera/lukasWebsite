---
# An instance of the Portfolio widget.
widget: portfolio
active: false

# This file represents a page section.
headless: true

# Order that this section appears on the page.
weight: 65

title: Projects
subtitle: ''

content:
  # Page type to display. E.g. project.
  page_type: project

  # Default filter index (e.g. 0 corresponds to the first `filter_button` instance below).
  filter_default: 0

  # Filter toolbar (optional).
  filter_button:
  - name: All
    tag: '*'
  - name: Digital Media
    tag: Digital Media
  - name: Policy
    tag: Policy
  - name: Psychopathy
    tag: Psychopathy
  - name: Other
    tag: Other

design:
  # Choose how many columns the section has. Valid values: '1' or '2'.
  columns: '1'

  # Toggle between the various page layout types.
  #   1 = List
  #   2 = Compact
  #   3 = Card
  #   5 = Showcase
  view: 1

  # For Showcase view, flip alternate rows?
  flip_alt_rows: false
---
