import React from 'react'
import _ from 'lodash'
import { Subject, Subscription } from 'rxjs'
import ReactDOM from 'react-dom'
//import { findDOMNode } from "react-dom"
// import moment from "moment"

const defaultRowsBefore = 15
const defaultPadding = 15

export interface DatatableProps<T> {
  data: T[]
  rowHeight?: number
  render: (
    data: T[],
    DataTable: {
      SearchField: (props: { placeholder: string }) => JSX.Element
      Table: (
        props: React.DetailedHTMLProps<
          React.TableHTMLAttributes<HTMLTableElement>,
          HTMLTableElement
        >
      ) => JSX.Element
      THead: (
        props: React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLTableSectionElement>,
          HTMLTableSectionElement
        >
      ) => JSX.Element
      TBody: (
        props: React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLTableSectionElement>,
          HTMLTableSectionElement
        > & {
          children: (data: T) => JSX.Element
        }
      ) => JSX.Element
      SortHeader: (props: SortHeaderProps<T>) => JSX.Element
    }
  ) => JSX.Element
  renderStatic?: (data: T[]) => JSX.Element
  renderCSV?: (data: T[]) => { [key: string]: number | string | null | undefined }[]
  reportTitle?: string
  initialSortField: keyof T
  pageSize: number
}
export interface DatatableState<T> {
  sortField: keyof T
  sortDirection: 'desc' | 'asc'
  searchString: string
  sortedData: T[]
}

export interface SortHeaderProps<T> {
  field: keyof T
  style?: React.CSSProperties
  children: React.ReactNode
}

interface DataTableBodyState {
  firstIndexOnScreen: number
  height: number
  lastIndexOnScreen: number
}

/*
.datatable thead,
tbody td {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
*/

class DataTableBody<T> extends React.PureComponent<
  { data: T[]; rowHeight: number; children: (data: T) => JSX.Element },
  DataTableBodyState
> {
  ref = React.createRef<HTMLTableSectionElement>()
  state: DataTableBodyState = {
    firstIndexOnScreen: 0,
    height: 500,
    lastIndexOnScreen: 20
  }
  onScroll = (e: any) => {
    const target: any = e.currentTarget
    const tableTop = target.scrollTop
    const firstIndexOnScreen = Math.floor(tableTop / this.props.rowHeight!)
    const lastIndexOnScreen = Math.ceil((tableTop + target.offsetHeight) / this.props.rowHeight!)
    this.setState({
      firstIndexOnScreen,
      lastIndexOnScreen
    })
  }
  render() {
    console.log('render dtablebody')
    const firstBlockH = Math.max(this.props.rowHeight! * this.state.firstIndexOnScreen, 0)
    const lastBlockH = Math.max(
      this.props.rowHeight! * (this.props.data.length - this.state.lastIndexOnScreen),
      0
    )
    const trueHeigth =
      firstBlockH +
      lastBlockH +
      (this.state.lastIndexOnScreen - this.state.firstIndexOnScreen) * this.props.rowHeight!
    const fullHeigth = this.props.rowHeight! * this.props.data.length
    /*
    console.log({
      fullHeigth,
      trueHeigth
    }) */
    if (fullHeigth !== trueHeigth) throw Error('different heights')
    const innerHeight = window.innerHeight
    console.log({ innerHeight })
    return (
      <tbody
        style={{
          display: 'block',
          overflowY: 'scroll',
          height: this.state.height
        }}
        onScroll={this.onScroll}
        ref={this.ref}
      >
        {_.chain(this.props.data)
          .map((data, idx) => {
            return { data, idx }
          })
          .groupBy(({ idx }) => {
            const before = idx < this.state.firstIndexOnScreen - defaultRowsBefore
            const after = idx > this.state.lastIndexOnScreen + defaultRowsBefore
            return before ? 'b' : after ? 'a' : 'v'
          })
          .map((d, key) => {
            //const realIndex = this.state.firstIndexOnScreen + index
            /*
            let marginTop = realIndex === this.state.firstIndexOnScreen ? firstBlockH : undefined
            let marginBottom = realIndex === this.state.lastIndexOnScreen ? lastBlockH : undefined
            */
            /*
          if (index === 0) {
            console.log({ index, realIndex, inScreen })
          } */
            if (key === 'a') {
              const height = d.length * this.props.rowHeight
              return <div style={{ height }} />
            } else if (key === 'b') {
              return d.map(__ => <div style={{ height: this.props.rowHeight }} />)
            } else {
              return d.map(d => (
                <tr
                  style={{
                    display: 'table',
                    width: '100%',
                    tableLayout: 'fixed'
                  }}
                  key={(d as any).id}
                >
                  {this.props.children(d.data)}
                </tr>
              ))
            }
          })
          .flatten()
          .value()}
      </tbody>
    )
  }
  componentDidMount() {
    const domNode = ReactDOM.findDOMNode(this.ref.current as any) as any
    const rect = domNode.getBoundingClientRect()
    this.setState({
      height: window.innerHeight - rect.top - defaultPadding
    })
    window.onresize = () => {
      // Do something.
      const domNode = ReactDOM.findDOMNode(this.ref.current as any) as any
      const rect = domNode.getBoundingClientRect()
      this.setState({
        height: window.innerHeight - rect.top - defaultPadding
      })
    }
  }
}

export class Datatable<T> extends React.PureComponent<DatatableProps<T>, DatatableState<T>> {
  generatePdfSubject = new Subject()
  subscriptions: Subscription[] = []
  state: DatatableState<T> = {
    sortedData: this.props.data,
    searchString: '',
    sortDirection: 'desc',
    sortField: this.props.initialSortField
  }

  THead = (
    props: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLTableSectionElement>,
      HTMLTableSectionElement
    >
  ) => {
    return (
      <thead
        {...props}
        style={{
          ...props.style,
          display: 'table',
          width: '100%',
          tableLayout: 'fixed'
        }}
      />
    )
  }
  Table = (
    props: React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>
  ) => {
    return <table style={{}} {...props} />
  }
  TBody = (
    props: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLTableSectionElement>,
      HTMLTableSectionElement
    > & {
      children: (data: T) => JSX.Element
    }
  ) => {
    return (
      <DataTableBody
        data={this.state.sortedData}
        rowHeight={this.props.rowHeight!}
        children={props.children}
      />
    )
  }
  SearchField = (props: { placeholder: string }) => {
    return (
      <input
        value={this.state.searchString}
        onChange={(e: any) => {
          this.onSearchStringChange(e.target.value)
        }}
        placeholder={props.placeholder}
      />
    )
  }
  SortHeader = (props: SortHeaderProps<T>) => {
    return (
      <th
        style={{ cursor: 'pointer', whiteSpace: 'nowrap', ...props.style }}
        onClick={() => {
          this.onSortFieldClick(props.field)
        }}
      >
        {props.children}{' '}
        {this.state.sortField === props.field
          ? this.state.sortDirection === 'desc'
            ? '⬇'
            : '⬆'
          : '⬍'}
      </th>
    )
  }
  onSortFieldClick = (sortField: keyof T) => {
    // console.log(sortField, this.state.sortField)
    if (sortField === this.state.sortField) {
      // console.log("do the fucckkin toggle")
      this.setState(
        {
          sortDirection: this.state.sortDirection === 'asc' ? 'desc' : 'asc'
        },
        () => {
          this.reSortAndGroup()
        }
      )
    } else {
      this.setState(
        {
          sortField: sortField,
          sortDirection: 'desc'
        },
        () => {
          this.reSortAndGroup()
        }
      )
    }
  }
  onSearchStringChange = (searchString: string) => {
    this.setState(
      {
        searchString
      },
      () => {
        this.reSortAndGroup()
      }
    )
  }
  reSortAndGroup() {
    let sortedData = this.props.data.slice()
    // console.log("update")
    if (this.state.searchString.length > 0) {
      sortedData = sortedData.filter((d: any) => {
        const a = _.map(d, val => {
          if (typeof val === 'string') {
            return val.toLowerCase().indexOf(this.state.searchString.toLowerCase()) !== -1
          } else {
            return false
          }
        })
        return a.reduce((acc, val) => {
          return acc || val
        }, false)
      })
    }
    if (this.state.sortField) {
      sortedData = _.sortBy(sortedData, this.state.sortField)
    }
    sortedData = this.state.sortDirection === 'asc' ? sortedData : _.reverse(sortedData)
    sortedData = _.take(sortedData, this.props.pageSize)
    // console.log(sortedData)
    this.setState({
      sortedData
    })
  }
  componentDidUpdate(prevProps: any) {
    if (this.props.data !== prevProps.data) {
      //  console.log(this.props.data)
      this.reSortAndGroup()
    }
  }
  render() {
    const data = this.state.sortedData
    console.log('render dtable')
    return this.props.render(data, {
      Table: this.Table,
      TBody: this.TBody,
      THead: this.THead,
      SearchField: this.SearchField,
      SortHeader: this.SortHeader
    })
  }

  componentDidMount() {
    this.reSortAndGroup()
  }
}
