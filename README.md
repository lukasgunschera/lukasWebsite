# lukasgunschera.com

A small static website: seven pages that share one design, and one folder of text files.

```
index.html, publications.html, talks.html, …   the pages (you rarely need to touch these)
content/                                         ALL YOUR TEXT LIVES HERE
  about.txt          biography and interests (home page)
  publications.txt   your ORCID and the hand-checked publication list
  talks.txt          talks and posters
  policy.txt         written and oral evidence
  teaching.txt       teaching and supervision
  engagement.txt     science communication, service, reviewing, memberships
  cv.txt             education, positions, awards, skills
  openalex.json      saved copy of your OpenAlex record (backup; no need to edit)
media/               photo, CV PDF, posters, slides, reports
assets/              design (site.css) and behaviour (site.js)
```

## Publications update themselves
Each visit, the site looks up your ORCID in OpenAlex, a free public database of research papers. Then it:
- adds any new paper,
- moves a preprint to "Journal articles" once it is published,
- adds citation counts and free-PDF links.

A new paper usually appears within days to weeks of its DOI being issued, once OpenAlex has it linked to your ORCID.
Only works with a DOI are added. OSF project pages, preregistrations, and Zenodo code or data deposits are skipped, and older versions of a paper are not listed twice.
If the live check can't run, the site uses the saved copy in `content/openalex.json`, so the list never looks broken.

## Editing on github.com (no software needed)
1. Open the `content` folder in the repository and click the file you want, e.g. `talks.txt`.
2. Click the pencil icon (Edit).
3. Change the text and click **Commit changes**. The site updates in about 30 seconds.

**The format.** One entry per line. Fields are separated by a vertical bar `|`:

    Date | Title | Details | Label (optional) | Link (optional) | Another link …

- A line starting with `## ` starts a new section with that heading.
- Lines starting with `#` are notes to yourself and are not shown.
- Links can be a web address or a file in `media/`. Give a link a name by writing `Slides: media/event/file.pdf`.
- If you leave a field empty, keep its `|` in place.

**Adding a talk:** copy the top line of `talks.txt`, paste it above, and change it:

    Nov 2026 | My talk title | Name of the event · City, Country | Keynote |

Talks with a future date are marked "Upcoming" automatically.

**Adding a poster or slides:** in the `media/event` folder click **Add file → Upload files**. Then put the file's path at the end of the talk's line, e.g. `media/event/2026_poster.pdf`.

**Replacing the CV:** upload a new `cv.pdf` to `media` (same name), plus a copy named `resume.pdf` for old links.

**Hiding a wrong publication:** add `hide | 10.xxxx/its-doi` near the top of `publications.txt`.
