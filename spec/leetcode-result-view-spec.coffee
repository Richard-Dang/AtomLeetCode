LeetcodeResultView = require '../lib/leetcode-result-view'

describe "LeetcodeResultView", ->
    leetcodeResultView = new LeetcodeResultView

    describe "when downloading", ->
        it "returns all the problems", ->
            waitsForPromise ->
                leetcodeResultView.download('https://leetcode.com/api/problems/all/').then (res) ->
                    expect(JSON.parse(res).stat_status_pairs.length).toBeGreaterThan(0)

        it "returns a single problem", ->
            waitsForPromise ->
                leetcodeResultView.download('https://leetcode.com/problems/two-sum').then (res) ->
                    expect(res).toBeDefined

    describe "when scraping html", ->
        it "collects the correct data", ->
            waitsForPromise ->
                leetcodeResultView.download('https://leetcode.com/problems/two-sum').then (res) ->
                    expect(leetcodeResultView.scrape(res).description).toBeDefined
                    expect(leetcodeResultView.scrape(res).codeArray).toBeDefined
