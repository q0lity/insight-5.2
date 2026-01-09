import XCTest

final class InsightSwiftUITests: XCTestCase {
    override func setUpWithError() throws {
        // Put setup code here. This method is called before the invocation of each test method in the class.

        // In UI tests it is usually best to stop immediately when a failure occurs.
        continueAfterFailure = false

        // In UI tests it’s important to set the initial state - such as interface orientation - required for your tests before they run. The setUp method is a good place to do this.
    }

    override func tearDownWithError() throws {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
    }

    @MainActor
    func testDragRescheduleMovesBlock() throws {
        let app = XCUIApplication()
        app.launch()

        app.tabBars.buttons["Calendar"].tap()
        let block = app.staticTexts["Morning focus block"]
        let scrollView = app.scrollViews.firstMatch
        for _ in 0..<4 {
            if block.exists && block.isHittable { break }
            scrollView.swipeUp()
        }
        XCTAssertTrue(block.waitForExistence(timeout: 2))
        let initialY = block.frame.minY

        let start = block.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        let end = start.withOffset(CGVector(dx: 0, dy: 140))
        start.press(forDuration: 0.2, thenDragTo: end)

        let updated = app.staticTexts["Morning focus block"]
        XCTAssertTrue(updated.waitForExistence(timeout: 2))
        XCTAssertGreaterThan(updated.frame.minY, initialY)
    }

    @MainActor
    func testConflictBannerOpensList() throws {
        let app = XCUIApplication()
        app.launchArguments = ["ui-test-conflicts"]
        app.launch()

        app.tabBars.buttons["Calendar"].tap()
        let banner = app.buttons["calendar.sync.conflict.banner"]
        XCTAssertTrue(banner.waitForExistence(timeout: 2))
        banner.tap()

        XCTAssertTrue(app.staticTexts["Sync Conflicts"].waitForExistence(timeout: 2))
    }
}
