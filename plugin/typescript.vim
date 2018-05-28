" vim-typescript - 1.0.0 - Runs the TypeScript compiler and TSLint in a
" background process, catpures output to QuickFix window.
"
" Tim Branyen (@tbranyen)
" Inspired by http://andrewvos.com/writing-async-jobs-in-vim-8

" This callback will be executed when the entire command is completed
function! BackgroundCommandClose()
  " Ensure the background command exists before doing any testing.
  if exists("g:ts_background_output_file")
    " Ensure the background command has output.
    if len(g:ts_background_output_file)
      " Pull the contents from the output file.
      let a:contents = readfile(g:ts_background_output_file)

      " Read into quickfix
      execute "cfile! " . g:ts_background_output_file

      " Automatically open the quickfix window on errors, close once fixed.
      if g:ts_auto_open_quickfix == 1
        if len(a:contents) > 0
          copen
          wincmd p
        else
          cclose
        endif
      endif

      " Clear out the variable contents.
      unlet g:ts_background_output_file
    endif
  endif
endfunction

" Kicks off the background task.
function! RunBackgroundTSC()
  " Safety check to ensure the proper VIM version is installed.
  if v:version < 800
    echoerr 'VIM TypeScript requires VIM version 8 or higher'
    return
  endif

  " Generate a background file to capture output into.
  let g:ts_background_output_file = tempname()

  let a:args = [
  \ 'node',
  \ g:ts_path_to_plugin . 'lib/controller',
  \ '--skipLibCheck',
  \ '--noEmit',
  \ expand('%')
  \]

  let a:opts = {
  \ 'close_cb': 'BackgroundCommandClose',
  \ 'out_io': 'file',
  \ 'out_name': g:ts_background_output_file
  \}

  call job_start(a:args, a:opts)
endfunction

autocmd! BufReadPost,BufWritePost *.ts silent! :call RunBackgroundTSC()
