from i18nlib import i18nUtil
import glob

class i18nYes(i18nUtil):
    '''Simulates a user that always answers yes'''
    def _askYesNo(self, question, default=None):
        return True

class i18nNo(i18nUtil):
    '''Simulates a user that always answers no'''
    def _askYesNo(self, question, default=None):
        return False

class TestRunner:
    '''The main component of the test suite'''
    def __init__(self):
        self.y = i18nYes()
        self.n = i18nNo()

    def _fileConvFunc(self, yes, py):
        '''Returns a function, depending on whether you want to convert a Python
        file, a TPL file, and whether the virtual user always answers yes or no
        @param yes: The answer of the user
        @param py: Is it a Python program, TPL assumed otherwise
        @return: A function
        '''
        def func(filein, fileout):
            if yes:
                if py:
                    return self.y.convertPY(filein, fileout)
                else:
                    return self.y.convertTPL(filein, fileout)
            else:
                if py:
                    return self.n.convertPY(filein, fileout)
                else:
                    return self.n.convertTPL(filein, fileout)
        return func

    def _test(self, filein, filexpect, testfunction):
        '''Test file's output against its expected output when passed through testfunction
        @param filein: The file to take as input
        @param filexpect: The file representing the expected output
        @param testfunction: The function producing the output from the input
        @return: Boolean representing success
        '''
        # Conversion
        tempfile = open('~tempfile.tmp', 'w')
        testfunction(filein, tempfile)
        tempfile.close()

        # Analysis of results
        tempfile = open('~tempfile.tmp', 'r')
        success = True
        linestmp = tempfile.read().split('\n')
        if linestmp[-1] == '':
            linestmp = linestmp[:-1]
        tempfile.close()
        linesexpected = filexpect.read().split('\n')
        if linesexpected[-1] == '':
            linesexpected = linesexpected[:-1]
        lt = len(linestmp)
        le = len(linesexpected)
        if lt != le:
            success = False
            print "ERROR: Number of lines in result and expected result differ"
            print "\t%s lines in output versus, %s lines in expected output" % (lt, le)
            if lt < le:
                print "Missing lines:"
                for l in linesexpected[(lt - le):]:
                    print "\t" + l
            else:
                print "Trailing 'junk' lines:"
                for l in linestmp[(le - lt):]:
                    print "\t" + l
        for (r, e) in zip(linestmp, linesexpected):
            if r != e:
                success = False
                print "GOT     :" + r
                print "EXPECTED:" + e
        return success

    def _testAll(self, filelist, testfunction):
        '''Test all files given in filelist against their expected outputs
        @param filelist: Name of files to test
        @param testfunction: The function used to convert the files
        @return: Boolean representing success
        '''
        for name in filelist:
            input = open(name, 'r')
            expect = open(name + '.out', 'r')
            print ">> Testing '%s' <<" % (name)
            if not self._test(input, expect, testfunction):
                return False
        return True

    def _testExtractionFromTPL(self, fileName, strings):
        print ">> Extracting from %s... " % fileName,
        file = open(fileName, 'r')
        result = [x[0] for x in i18nUtil().getI18nStringsTPL(file)]
        if sorted(result) != sorted(strings):
            print "failed"
            print sorted(result)
            print sorted(strings)
        else:
            print "ok"

    def _testExtraction(self):
        """Check that translatable strings are being extracted."""
        self._testExtractionFromTPL('testsuitedata/userdetails.yes.tpl.out',
            ['Details for', 'Affiliation', 'Email', 'Address', 'Telephone', 'Fax', 'modify',
             'Your account(s)', 'Account status', 'Special Rights', 'Category Manager', 'Event Manager'])

    def run(self):
        '''Run all tests located in the folder testdata.
        Known extensions are: .yes.py, .no.py, .yes.tpl, .no.tpl. The
        extensions determine if the file has to be converted by either
        the TPL converter or the Python converter and whether the test user
        always answers yes, or no.'''
        yesPyTests = glob.glob('testsuitedata/*.yes.py')
        self._testAll(yesPyTests, self._fileConvFunc(True, True))
        noPyTests = glob.glob('testsuitedata/*.no.py')
        self._testAll(noPyTests, self._fileConvFunc(False, True))
        yesTplTests = glob.glob('testsuitedata/*.yes.tpl')
        self._testAll(yesTplTests, self._fileConvFunc(True, False))
        noTplTests = glob.glob('testsuitedata/*.no.tpl')
        self._testAll(noTplTests, self._fileConvFunc(False, False))

        self._testExtraction()

if __name__ == "__main__":
    t = TestRunner()
    t.run()
