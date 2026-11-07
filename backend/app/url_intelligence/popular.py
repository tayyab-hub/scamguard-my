# Hand-reviewed list of widely used legitimate registrable domains (url_rules_v4). It reduces
# false alarms caused by the host-only model misjudging well-known sites (for example github.com).
# It is deliberately small and maintained by hand: third-party ranking lists were not copied
# because their redistribution terms are unclear. Free-hosting services are excluded because
# anyone can publish under them, and brand-official domains live in brands.py.

"""Well-known legitimate domains and registry-restricted Malaysian endings."""

from __future__ import annotations

POPULAR_DOMAINS = frozenset(
    """
    youtube.com wikipedia.org github.com gitlab.com stackoverflow.com linkedin.com twitter.com
    x.com tiktok.com reddit.com yahoo.com bing.com duckduckgo.com zoom.us telegram.org
    spotify.com canva.com notion.so dropbox.com adobe.com medium.com cloudflare.com openai.com
    chatgpt.com anthropic.com claude.ai wordpress.org mozilla.org bbc.com bbc.co.uk cnn.com
    nytimes.com theguardian.com reuters.com apnews.com booking.com agoda.com airbnb.com
    expedia.com trip.com ebay.com aliexpress.com alibaba.com temu.com shein.com imdb.com
    quora.com pinterest.com twitch.tv discord.com slack.com trello.com atlassian.com
    w3schools.com coursera.org udemy.com khanacademy.org duolingo.com edx.org python.org
    npmjs.com pypi.org docker.com kaggle.com figma.com miro.com zoho.com samsung.com
    huawei.com xiaomi.com lenovo.com dell.com hp.com intel.com nvidia.com oracle.com ibm.com
    salesforce.com shopify.com etsy.com walmart.com visa.com mastercard.com wise.com
    revolut.com stripe.com malaysiakini.com thestar.com.my nst.com.my bharian.com.my
    hmetro.com.my sinarharian.com.my utusan.com.my freemalaysiatoday.com astro.com.my
    astroawani.com mudah.my carousell.com carousell.com.my foodpanda.my airasia.com
    malaysiaairlines.com myeg.com.my ktmb.com.my rapidkl.com.my petronas.com shell.com.my
    mydin.com.my aeon.com.my watsons.com.my guardian.com.my senheng.com.my zalora.com.my
    pgmall.my mr-diy.com tm.com.my yes.my u.com.my umobile.com.my redone.com.my
    hongleongbank.com uob.com.my ocbc.com.my hsbc.com.my standardchartered.com.my
    bankrakyat.com.my agrobank.com.my mbsbbank.com alrajhibank.com.my takaful-malaysia.com.my
    greateasternlife.com aia.com.my prudential.com.my allianz.com.my etiqa.com.my zurich.com.my
    """.split()
)
# Only government bodies and recognised educational institutions can register under these
# endings, so a page there is far less likely to be a throwaway phishing domain.
RESTRICTED_SUFFIXES = (".gov.my", ".edu.my", ".mil.my")


def is_popular(registrable_domain: str | None) -> bool:
    return bool(registrable_domain) and registrable_domain in POPULAR_DOMAINS


def is_restricted_registry(registrable_domain: str | None) -> bool:
    return bool(registrable_domain) and registrable_domain.endswith(RESTRICTED_SUFFIXES)
