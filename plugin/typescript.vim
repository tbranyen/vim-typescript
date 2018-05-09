" Inspired by http://andrewvos.com/writing-async-jobs-in-vim-8

" This callback will be executed when the entire command is completed
function! BackgroundCommandClose(channel)
  let g:contents = readfile(g:backgroundCommandOutput)

  " Read into quickfix
  execute "cfile! " . g:backgroundCommandOutput


  if len(g:contents) > 0
    copen
    wincmd p
  else
    cclose
  endif

  unlet g:backgroundCommandOutput
  unlet g:contents
endfunction

function! RunBackgroundTSC()
  if v:version < 800
    echoerr 'VIM TypeScript requires VIM version 8 or higher'
    return
  endif

  let g:backgroundCommandOutput = tempname()

  echo g:path_to_ts_plugin . 'lib/controller'

  let a:args = [
  \ 'node',
  \ g:path_to_ts_plugin . 'lib/controller',
  \ '--skipLibCheck',
  \ '--noEmit',
  \ expand('%')
  \]

  let a:opts = {
  \ 'close_cb': 'BackgroundCommandClose',
  \ 'out_io': 'file',
  \ 'out_name': g:backgroundCommandOutput
  \}

  call job_start(a:args, a:opts)
endfunction

autocmd! BufReadPost,BufWritePost *.ts silent! :call RunBackgroundTSC()
