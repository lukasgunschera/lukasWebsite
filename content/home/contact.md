---
# An instance of the Contact widget.
# Documentation: https://sourcethemes.com/academic/docs/page-builder/
widget: contact

# This file represents a page section.
headless: true

# Order that this section appears on the page.
weight: 130

title: Contact
subtitle:

content:
  # Automatically link email and phone or display as text?
  autolink: true
  
  # Email form provider
  form:
    provider: netlify
    formspree:
      id:
    netlify:
      # Enable CAPTCHA challenge to reduce spam?
      captcha: true

  # Add custom contact links
  links:
    - icon_pack: fab
      icon: plug
      name: Follow me on BlueSky
      link: "https://bsky.app/profile/lukasgunschera.bsky.social"

design:
  columns: '2'
---
