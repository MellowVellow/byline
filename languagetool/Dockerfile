# Custom LanguageTool with user spelling additions.
# Manual: https://dev.languagetool.org/hunspell-support
# spelling.txt = ignore + use to generate corrections; ignore.txt = ignore only; prohibited.txt = always incorrect.
FROM erikvl87/languagetool

USER root
COPY en_spelling_additions.txt en_spelling_additions.txt
COPY en_ignore_additions.txt en_ignore_additions.txt
RUN (echo; cat en_spelling_additions.txt) >> org/languagetool/resource/en/hunspell/spelling.txt \
 && (echo; cat en_ignore_additions.txt) >> org/languagetool/resource/en/hunspell/ignore.txt
USER languagetool
