import { useEffect, useState } from 'react';
import {
  Button,
  Container,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  createTheme,
  CssBaseline,
  ThemeProvider,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Link,
  TextareaAutosize
} from '@mui/material';
import OpenAI from 'openai';
import './App.css';

function App() {
  const [url, setUrl] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [result, setResult] = useState([]);
  const [error, setError] = useState({ url: false });
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState({ status: false, message: 'Getting Image...' });

  const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAI_API_KEY, dangerouslyAllowBrowser: true });

  useEffect(() => {
    createThread();
  }, [url]);

  const createThread = async () => {
    const thread = await openai.beta.threads.create();
    setThreadId(thread.id);
  };

  const darkTheme = createTheme({ palette: { mode: 'dark' } });

  const createMessage = async (url) => {
    setLoading({ status: true, message: 'Analyzing...' });
    const message = await openai.beta.threads.messages.create(
      threadId,
      {
        role: "user",
        content: [
          { "type": "text", "text": "Give me a tabulated score-based assessment of the visual components of this image. Table fields are as follows: 1. Visual Component, 2. Score, 3. Comments." },
          { "type": "image_url", "image_url": { "url": url } },
        ]
      }
    );
    console.log(message);
    let run = await openai.beta.threads.runs.createAndPoll(
      threadId,
      { assistant_id: process.env.REACT_APP_ASSISTANT_ID }
    );
    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(run.thread_id);
      for (const message of messages.data.reverse()) {
        if (message.role !== "assistant") continue;
        console.log(`${message.role} > ${message.content[0].text.value}`);
        let { text } = message.content[0];
        text.value = text.value.replace(/\*\*/g, "").replace(/\#\#\#/g, "");
        const extractedArrays = text.value.split("\n").map(line => line.split('|').map(item => item.trim()).filter(item => !item.includes("-----") && item !== ""));
        setResult(extractedArrays.filter(item => item.length > 2));
      }
      setLoading({ status: false, message: 'Getting Image...' });
    } else {
      setLoading({ status: false, message: 'Getting Image...' });
    }
  };

  const getScreenshot = async () => {
    if (url === "") {
      setError({ url: true, message: 'Please enter a valid URL.' });
      return;
    }
    if (error.url) return;
    setImageUrl("");
    setError({ url: false });
    setResult([]);
    setLoading({ status: true, message: 'Getting Image...' });

    await fetch('https://platform.dkv.global/dashboards/api/screenshot/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })
      .then(response => response.json())
      .then(async data => {
        console.log(data);
        if (!data.renderUrl) {
          setLoading({ status: false, message: 'Getting Image...' });
          alert('Failed to get image. Please try again.');
          return;
        }
        setImageUrl(data.renderUrl);
        await createMessage(data.renderUrl);
      });
  };

  const isValidUrl = (input) => {
    const pattern = new RegExp('^(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?$', 'i');
    return pattern.test(input);
  };

  const handleUrlChange = (e) => {
    const inputUrl = e.target.value;
    setUrl(inputUrl);
    if (!isValidUrl(inputUrl) && inputUrl.length > 0) {
      setError({ url: true, message: 'Please enter a valid URL.' });
    } else {
      setError({ url: false, message: '' });
    }
  };

  const handleTextChange = (e) => {
    setProjectDescription(e.target.value);
  };

  const handleFileUpload = (e) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async () => {
    // Add your submit logic here to handle URL, text, and file inputs
    if (url) {
      await getScreenshot();
    }
    if (projectDescription) {
      // Handle project description submission
    }
    if (files.length > 0) {
      // Handle file uploads
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container className="App" style={{ padding: '2rem' }}>
        <Typography variant="h4" component="h2" textAlign={"center"}>
          Component Registry Assistant Mk2
        </Typography>
        <Grid container alignItems={"center"} spacing={2} marginTop={"10px"}>
          <Grid item xs={12}>
            <TextField
              type="url"
              error={error.url}
              id="url-basic"
              label="Website URL"
              fullWidth
              variant="outlined"
              value={url}
              onChange={handleUrlChange}
              placeholder="Input website URL"
              helperText={error.message}
            />
          </Grid>
          <Grid item xs={12}>
            <TextareaAutosize
              minRows={4}
              placeholder="Input project description"
              style={{ width: '100%' }}
              value={projectDescription}
              onChange={handleTextChange}
            />
          </Grid>
          <Grid item xs={12}>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              accept=".png, .jpg, .jpeg, .pdf, .ppt, .xlsx"
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleSubmit} size="large">
              Submit
            </Button>
          </Grid>
        </Grid>
        {imageUrl !== "" && (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: 2 }}>
            <Link href={imageUrl} target="_blank" rel="noopener noreferrer">
              Visit Image
            </Link>
          </Box>
        )}
        {loading.status && (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
            <CircularProgress size={70} />
            <Typography variant="h6" component="h2" textAlign={"center"} marginTop={2}>
              {loading.message}
            </Typography>
          </Box>
        )}
        {!loading.status && result.length > 0 && (
          <Container>
            <Typography variant="h4" component="h2" textAlign={"center"} marginTop={"20px"}>Analysis Result</Typography>
            <TableContainer component={Paper} sx={{ marginTop: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="result table">
                <TableHead>
                  <TableRow>
                    {result[0].map((item, index) => <TableCell key={index}>{item}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.slice(1).map((row, index) => (
                    <TableRow key={index}>
                      {row.map((item, index) => <TableCell key={index}>{item}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Container>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
