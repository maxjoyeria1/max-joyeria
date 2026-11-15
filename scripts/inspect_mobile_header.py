import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # iPhone 13 / 14 / 15 dimensions: 390 x 844
        context = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page = await context.new_page()
        await page.goto("http://localhost:8080/index.html")
        await page.wait_for_timeout(1000)

        # Get bounding boxes
        announcement_box = await page.eval_on_selector(".announcement-bar", "el => el.getBoundingClientRect()")
        header_box = await page.eval_on_selector(".site-header", "el => el.getBoundingClientRect()")
        brand_box = await page.eval_on_selector(".brand-link", "el => el.getBoundingClientRect()")
        logo_box = await page.eval_on_selector(".brand-logo-img", "el => el.getBoundingClientRect()")
        actions_box = await page.eval_on_selector(".header-actions", "el => el.getBoundingClientRect()")
        emprender_box = await page.eval_on_selector(".btn-whatsapp-header", "el => el.getBoundingClientRect()")

        print("Announcement bar box:", announcement_box)
        print("Site header box:", header_box)
        print("Brand link box:", brand_box)
        print("Logo box:", logo_box)
        print("Header actions box:", actions_box)
        print("Emprender btn box:", emprender_box)

        # Take screenshot of top section
        await page.screenshot(path="mobile_header_current.png", clip={"x": 0, "y": 0, "width": 390, "height": 400})
        await browser.close()
        print("Screenshot saved to mobile_header_current.png")

asyncio.run(run())
