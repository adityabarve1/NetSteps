import styles from './lesson.module.css';

// An illustration, not real output: the exact columns and values depend on the
// browser and on the page. The names are made up.
const SAMPLE = `Name          Status  Type        Size          Time
example.com   200     document    1.3 kB        45 ms
styles.css    200     stylesheet  4.2 kB        31 ms
app.js        200     script      18.6 kB       52 ms
logo.png      200     png         (disk cache)  2 ms`;

const key = (text: string) => <kbd>{text}</kbd>;

/** "On your own computer": watch your browser act as a client. */
export function RealComputer() {
  return (
    <>
      <p>
        Only do this on your own device and network. Your web browser is a
        client, and you can watch it work. This looks at what your browser is
        already doing. It reads only, and it changes nothing on the website.
      </p>

      <h3>See the requests your browser sends</h3>
      <ol className={styles.steps}>
        <li>Open any web page you like in Chrome, Edge or Firefox.</li>
        <li>
          Open the browser&rsquo;s developer tools: press {key('F12')}, or
          right-click the page and choose <strong>Inspect</strong>. On a Mac you
          can also press {key('Cmd')}+{key('Option')}+{key('I')}. If nothing
          happens, your browser may have developer tools switched off, as some
          school and work computers do.
        </li>
        <li>
          Click the tab called <strong>Network</strong>. Stay in this tab.
        </li>
        <li>
          Reload the page ({key('F5')}, or {key('Ctrl')}+{key('R')}; on a Mac{' '}
          {key('Cmd')}+{key('R')}). Reloading asks for the page again, as it
          always does. A list of rows fills in.
        </li>
      </ol>
      <p>Your list will look something like this, though yours will differ:</p>
      <pre className={styles.output}>{SAMPLE}</pre>

      <h3>What the columns mean</h3>
      <p>
        Each row is one request your browser sent and the response it got back.
        A single page often needs many requests: the page itself, then its
        styles, scripts, pictures and fonts. Browsers differ a little in which
        columns they show and what they call them. Look for these:
      </p>
      <ul>
        <li>
          <strong>Name</strong>: what was asked for, such as the page, a style
          file or a picture.
        </li>
        <li>
          <strong>Status</strong>: a number the server sends to say how it went.
          200 means &ldquo;OK, here it is&rdquo;. 404 means &ldquo;I could not
          find that&rdquo;. Numbers starting with 3 usually mean the browser is
          being sent somewhere else or told it already has the latest copy.
        </li>
        <li>
          <strong>Type</strong>: the kind of thing that came back, for example a
          document (the page), a stylesheet, a script or an image.
        </li>
        <li>
          <strong>Size</strong>: how much data came back. When the browser
          reused a copy it saved earlier, this column may say something like
          &ldquo;cache&rdquo; instead of a number, which means a saved copy was
          used.
        </li>
        <li>
          <strong>Time</strong>: how long the request took, in milliseconds (ms,
          thousandths of a second).
        </li>
      </ul>
      <p>
        Click one row. A panel opens, and its <strong>Headers</strong> part
        shows the address that was requested and the status of the answer. Rows
        can come from different servers: a page may load pictures or scripts
        from other places than the page itself. Your browser is a client of all
        of them.
      </p>
      <p>
        Near the edge of the panel, browsers usually show totals, such as how
        many requests the page made. Count a few rows and compare. That is
        client-server at work: many small requests, each one answered by a
        server.
      </p>
    </>
  );
}
