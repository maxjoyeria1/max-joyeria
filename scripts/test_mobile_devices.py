import asyncio
from playwright.async_api import async_playwright

devices = [
    {"name": "compact_360", "width": 360, "height": 780},
    {"name": "iphone_390", "width": 390, "height": 844},
    {"name": "galaxy_412", "width": 412, "height": 915},
]

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for dev in devices:
            context = await browser.new_context(viewport={"width": dev["width"], "height": dev["height"]}, device_scale_factor=2)
            page = await context.new_page()
            await page.goto("http://localhost:8080/index.html")
            await page.wait_for_timeout(600)

            # Measurements
            announcement_box = await page.eval_on_selector(".announcement-bar", "el => el.getBoundingClientRect()")
            header_box = await page.eval_on_selector(".site-header", "el => el.getBoundingClientRect()")
            brand_box = await page.eval_on_selector(".brand-link", "el => el.getBoundingClientRect()")
            actions_box = await page.eval_on_selector(".header-actions", "el => el.getBoundingClientRect()")
            
            print(f"=== {dev['name']} ({dev['width']}x{dev['height']}) ===")
            print("Announcement bar height:", announcement_box["height"], "top:", announcement_box["top"])
            print("Header box height:", header_box["height"], "top:", header_box["top"], "bottom:", header_box["bottom"])
            print("Brand link height:", brand_box["height"], "top:", brand_box["top"], "bottom:", brand_box["bottom"])
            print("Brand link fully inside header:", brand_box["top"] >= header_box["top"] and brand_box["bottom"] <= header_box["bottom"])
            print("Actions box right:", actions_box["right"], "screen width:", dev["width"], "overflows:", actions_box["right"] > dev["width"])
            
            # Screenshot of the top header area
            screenshot_path = f"mobile_header_{dev['name']}.png"
            await page.screenshot(path=screenshot_path, clip={"x": 0, "y": 0, "width": dev["width"], "height": 260})
            print(f"Saved screenshot: {screenshot_path}\n")
            await context.close()

        await browser.close()

asyncio.run(run())
