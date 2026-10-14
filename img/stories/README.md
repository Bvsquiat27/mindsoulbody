# Story illustrations

Original illustrations made for Mind Soul & Body, one for each story in Stories for little ones. They were generated for this app. This project owns the pictures. They are not copied from a book, a site, or someone else’s artwork.

`<id>.webp` is the large picture, about 1024 by 576. `<id>-512.webp` is the smaller cover used on the story grid.

Changed art always gets a new file name (for example `noah-2.webp`). The service worker keeps story art across updates and only downloads names it has not seen, so a picture edited under the same name would never reach phones that already have it. `art-files.test.mjs` checks every art file against `img/art-hashes.json`.
