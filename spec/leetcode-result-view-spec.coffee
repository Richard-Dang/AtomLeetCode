LeetcodeResultView = require '../lib/leetcode-result-view'

describe "LeetcodeResultView", ->
    leetcodeResultView = new LeetcodeResultView

    describe "when downloading", ->
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

    describe "when getting problem", ->
        beforeEach ->
            leetcodeResultView.testing = true
            waitsForPromise ->
                atom.workspace.open('test.js')

        it "gets all problems", ->
            waitsForPromise ->
                leetcodeResultView.getQuestionList().then (questionList) ->
                    expect(questionList.length).toBeGreaterThan(450)

        it "gets an easy problem", ->
            leetcodeResultView.getProblem(1 , null)

            waitsFor (->
                leetcodeResultView.allSolutions != -1),'Took too long',15000
            runs ->
                expect(leetcodeResultView.codeText).toBeDefined

        it "gets an medium problem", ->
            leetcodeResultView.getProblem(2 , null)

            waitsFor (->
                leetcodeResultView.allSolutions != -1),'Took too long',15000
            runs ->
                expect(leetcodeResultView.codeText).toBeDefined

        it "gets an hard problem", ->
            leetcodeResultView.getProblem(3 , null)

            waitsFor (->
                leetcodeResultView.allSolutions != -1),'Took too long',15000
            runs ->
                expect(leetcodeResultView.codeText).toBeDefined

        it "gets solutions", ->
            leetcodeResultView.getProblem(null,'two sum')

            waitsFor (->
                leetcodeResultView.allSolutions != -1),'Took too long',15000
            runs ->
                expect(leetcodeResultView.allSolutions.length).toBeGreaterThan(0)
