" vim-typescript - 1.0.0 - Runs the TypeScript compiler in a background
" process, catpures output to QuickFix window.
"
" Tim Branyen (@tbranyen)
" Originally inspired by http://andrewvos.com/writing-async-jobs-in-vim-8

" This callback will be executed when the entire command is completed
function! BackgroundCommandClose(channel)
  let status = ch_status(a:channel, { "part": "out" })
  let output = ""

  " If there is output to display, read into variable.
  while ch_status(a:channel, { "part": "out" }) == "buffered"
    let l:output .= ch_read(a:channel) . "\x0a"
  endwhile

  " If output exists, pump into quickfix
  if len(output) > 1
    " Put the output into quickfix.
    cgetexpr output

    " Automatically open the quickfix window on errors, close once fixed.
    if g:ts_auto_open_quickfix == 1
      if len(contents) > 0
        copen
        " Toggle back to original buffer.
        wincmd p
      else
        cclose
      endif
    endif
  " Else wipe out quickfix contents.
  else
    cgetexpr ""
  endif
endfunction

" Kicks off the background task.
function! RunBackgroundTSC()
  " Safety check to ensure the proper VIM version is installed.
  if v:version < 800
    echoerr "VIM TypeScript requires VIM version 8 or higher"
    return
  endif

  let a:args = [
  \ "node",
  \ g:ts_path_to_plugin . "vim-typescript.js",
  \ "--skipLibCheck",
  \ "--noEmit",
  \ expand("%")
  \]

  let a:opts = {
  \ "close_cb": "BackgroundCommandClose"
  \}

  call job_start(a:args, a:opts)
endfunction

autocmd! BufReadPost,BufWritePost *.ts,*.tsx silent! :call RunBackgroundTSC()
