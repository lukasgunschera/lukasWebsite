---
title: "The surprisingly simple way to update Font Awesome icons if you have an old(er) Hugo Wowchemy Academic website"
author: 'Isobel Beasley'
date: '2024-08-29'
slug: update-fa-old-hugo
categories: ['Resources', 'General Coding', 'Hugo webpages']
tags: ['R', 'Blogdown', 'Hugo', 'Font Awesome']
subtitle: 'AKA: What I learnt by spending a frustrating 2 days trying to get bluesky icons on my website'
summary: 'AKA: What I learnt by spending a frustrating 2 days trying to get bluesky icons on my website'
authors: ['Isobel Beasley']
lastmod: '2024-08-29T11:00:18-07:00'
featured: no
image:
  caption: ''
  focal_point: ''
  preview_only: no
projects: []
meta_summary: "Learn how to update Font Awesome icons on older Hugo Wowchemy Academic websites. Step-by-step guide to add new icons like Bluesky to your personal academic site."
highlight: true
---

If you have an older academic Hugo webpage (as in, one before the event of Hugo blocks), you may have been puzzled to discover as I was, when you tried to add a blue sky icon link to your webpage… you couldn't. You tried the same kind of code that worked for any other social media site... you spelt bluesky correctly.. and there is a [bluesky icon listed on the Font Awesome website](https://fontawesome.com/icons/bluesky?f=brands&s=solid) ... so surely you can add a bluesky icon? Why on earth is the bluesky icon <b><i>still</i></b> not appearing?  

Well as I discovered, a [bluesky icon Font Awesome icon didn’t arrive until version 6.5.2](https://fontawesome.com/changelog), and the old Hugo webpages use Font Awesome 5 (in my case v5.14.0). 

After a couple days of messing around in frustration, I found two different ways to finally get the bluesky icon working with ease on your webpage. 

1. Add the bluesky icon individually to your `assets/media/icons` subfolder. 
2. Update the whole Font Awesome library 

I opted for approach 2., so that's what I will discuss in this article. And now that I know what I am doing, it turns out updating Font Awesome is super easy. So please, put my frustration to good use and follow the below steps: 

1. [Choose Font Awesome version](#step-1-choose-which-version-of-font-awesome-you-want-to-update-to)

2. [Find the relevant SRI hash](#step-2-find-the-sri-hash-for-the-version-you-chose-on-httpscdnjscomlibrariesfont-awesome)

3. [Navigate to the relevant of assets.toml file](#step-3-navigate-to-the-cssfontawesome-line-in-your-dataassetstoml-file)

4. [Replace the relevant versioning information in this assets.toml file](#step-4-replace-the-relevant-versioning-information-in-this-assetstoml-file)

5. [Commit, push and reap the rewards](#step-5-commit-push-and-reap-the-rewards)

<br>

## Step 1. Choose which version of Font Awesome you want to update to

I chose to update to the latest release, 6.6.0 (* latest at the time of writing). If you’re trying to update to get the bluesky icon, any version >=6.5.2 will work. To help you make your decision, you may want to check out [the Font Awesome change log](https://fontawesome.com/changelog.) and consider what changes are important to you. 

<br>

## Step 2. Find the SRI hash for the version you chose on: https://cdnjs.com/libraries/font-awesome 


![Click on the shield icon to get the SRI hash](cdnjs-sri-screenshot-cropped-v2.svg)

If you’re in the same boat as me, you’re likely wanting to get the “all min” set of icons (i.e. the set with this listed URL: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css). The SRI hash for this icon set is found just to the right of the link; you copy it by clicking the shield icon.

If you’re not sure which set of icons you want, skip to step 3 for the time being and see what URL end is listed there. For e.g. if the relevant line is `url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/%s/css/all.min.css"`, because this URL ends in "all.min.css" then you know you're looking for the "all min" set. 

<br>

## Step 3. Navigate to the "`[css.fontAwesome]`" line in your data/assets.toml file

The easiest way to find this line is to search your website’s repository files for the term “`css.fontAwesome`” on github (or whatever git service you are using to host your repository). This search step and the file section you ultimately navigate to should look like this: 

The search step: 

![Use the top right search bar on github to search for the 'css.fontAwesome line in assets.toml](github-fa-search-screenshot-cropped-v2.svg)

The search result: 

![This section of your assets.toml file is what you're looking for; A line with '[css.fontAwesome]' followed by a version line, sri line and a url line. We're going to be modifying the version and sri line.](github-fa-search-result-screenshot-cropped-v2.svg)


<br> 

## Step 4. Replace the relevant versioning information in this assets.toml file 

Just below the "`[css.fontAwesome]`" line,  you should see a version line like: 

`version = "5.14.0"`

At this line, replace the number with the version number you want to update to. For instance, in my case, updating to version 6.6.0 the replacement line is: 

`version = “6.0.0”. `

Then, update the provided SRI hash by replacing the one listed here with the one you found in step 2. 

<br>

## Step 5. Commit, push and reap the rewards 

Once these changes have been saved, you can add the new/updated icons to the social sections of the old-style Hugo academic website. For instance, now that I was using a Font Awesome version where a bluesky icon exists, I could include the following code in my `author/admin/_index.md` file to get an icon that links to my bluesky profile on my <a href="/author/isobel-beasley/">'About me' section</a>. 

```
social:
- icon: bluesky
  icon_pack: fab
  link: https://bsky.app/profile/ijbeasley.bsky.social
```

You can also add the icons to any post using the relevant html code. For example, here's some html code I could write to get an icon that links to my bluesky profile: 

```
<a href=”https://bsky.app/profile/ijbeasley.bsky.social”>
<i class="fa-brands fa-bluesky"></i>
</a>
``` 

Which will render like this: 

<a href=”https://bsky.app/profile/ijbeasley.bsky.social”>
<i class="fa-brands fa-bluesky"></i>
</a>

<br>
<br>
<br>

## And ... that's it!

That's really all there you need to know to update your Font Awesome icons - and add your bluesky profile to your personal website. Reach out if you have any questions or run into any problems trying the same thing!

